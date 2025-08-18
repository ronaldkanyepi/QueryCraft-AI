from typing import Any
from uuid import UUID
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from langchain_core.documents import Document
from loguru import logger
from pydantic import TypeAdapter, ValidationError
from app.schemas import DocumentResponse, SearchQuery, SearchResult
from app.services.embbedings import Collection
from app.utils import process_document

_metadata_adapter = TypeAdapter(list[dict[str, Any]])

router = APIRouter()
user = "default_user"


@router.post("/{collection_id}", response_model=dict[str, Any])
async def documents_create(
    collection_id: UUID,
    files: list[UploadFile] = File(...),
    metadatas_json: str | None = Form(None),
):
    """Processes and indexes (adds) new document files with optional metadata."""
    # If no metadata JSON is provided, fill with None
    if not metadatas_json:
        metadatas: list[dict] | list[None] = [None] * len(files)
    else:
        try:
            # This will both parse the JSON and check the Python types
            # (i.e. that it's a list, and every item is a dict)
            metadatas = _metadata_adapter.validate_json(metadatas_json)
        except ValidationError as e:
            # Pydantic errors include exactly what went wrong
            raise HTTPException(status_code=400, detail=e.errors())
        # Now just check that the list length matches
        if len(metadatas) != len(files):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Number of metadata objects ({len(metadatas)}) "
                    f"does not match number of files ({len(files)})."
                ),
            )

    docs_to_index: list[Document] = []
    processed_files_count = 0
    failed_files = []

    # Pair files with their corresponding metadata
    for file, metadata in zip(files, metadatas, strict=False):
        try:
            # Pass metadata to process_document
            langchain_docs = await process_document(file, metadata=metadata)
            if langchain_docs:
                docs_to_index.extend(langchain_docs)
                processed_files_count += 1
            else:
                logger.info(
                    f"Warning: File {file.filename} resulted "
                    f"in no processable documents."
                )


        except Exception as proc_exc:

            logger.info(f"Error processing file {file.filename}: {proc_exc}")
            failed_files.append(file.filename)

    if not docs_to_index:
        error_detail = "Failed to process any documents from the provided files."
        if failed_files:
            error_detail += f" Files that failed processing: {', '.join(failed_files)}."
        raise HTTPException(status_code=400, detail=error_detail)


    try:
        collection = Collection(
            collection_id=str(collection_id),
            user_id=user,
        )
        added_ids = await collection.upsert(docs_to_index)
        if not added_ids:
            raise HTTPException(
                status_code=500,
                detail="Failed to add document(s) to vector store after processing.",
            )


        success_message = (
            f"{len(added_ids)} document chunk(s) from "
            f"{processed_files_count} file(s) added successfully."
        )
        response_data = {
            "success": True,
            "message": success_message,
            "added_chunk_ids": added_ids,
        }

        if failed_files:
            response_data["warnings"] = (
                f"Processing failed for files: {', '.join(failed_files)}"
            )


        return response_data

    except HTTPException as http_exc:
        # Reraise HTTPExceptions from add_documents_to_vectorstore or previous checks
        raise http_exc
    except Exception as add_exc:
        # Handle exceptions during the vector store addition process
        logger.info(f"Error adding documents to vector store: {add_exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add documents to vector store: {add_exc!s}",
        )


@router.get(
    "/{collection_id}", response_model=list[DocumentResponse]
)
async def documents_list(
    collection_id: UUID,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Lists documents within a specific collection."""
    collection = Collection(
        collection_id=str(collection_id),
        user_id=user,
    )
    return await collection.list(limit=limit, offset=offset)


@router.delete(
    "/{collection_id}/{document_id}",
    response_model=dict[str, bool],
)
async def documents_delete(
    collection_id: UUID,
    document_id: str,
):
    """Deletes a specific document from a collection by its ID."""
    collection = Collection(
        collection_id=str(collection_id),
        user_id=user,
    )

    success = await collection.delete(file_id=document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Failed to delete document.")

    return {"success": True}


@router.post(
    "/{collection_id}/search", response_model=list[SearchResult]
)
async def documents_search(
    collection_id: UUID,
    search_query: SearchQuery,
):
    """Search for documents within a specific collection."""
    if not search_query.query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    collection = Collection(
        collection_id=str(collection_id),
        user_id=user,
    )

    results = await collection.search(
        search_query.query,
        limit=search_query.limit or 10,
    )
    return results
