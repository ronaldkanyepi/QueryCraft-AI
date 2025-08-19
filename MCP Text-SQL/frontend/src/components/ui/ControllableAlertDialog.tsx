"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DialogOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
}

export interface ControllableAlertDialogHandle {
    confirm: (options: DialogOptions) => Promise<boolean>;
}

export const ControllableAlertDialog = forwardRef<ControllableAlertDialogHandle>((_props, ref) => {
    const [options, setOptions] = useState<DialogOptions | null>(null);
    const [resolve, setResolve] = useState<(value: boolean) => void>(() => {});

    useImperativeHandle(ref, () => ({
        confirm: (newOptions: DialogOptions) => {
            return new Promise<boolean>((res) => {
                setOptions(newOptions);
                setResolve(() => res);
            });
        },
    }));

    const handleClose = () => setOptions(null);
    const handleConfirm = () => {
        resolve(true);
        handleClose();
    };
    const handleCancel = () => {
        resolve(false);
        handleClose();
    };

    return (
        <AlertDialog open={options !== null} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{options?.title}</AlertDialogTitle>
                    <AlertDialogDescription>{options?.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>{options?.cancelText ?? "Cancel"}</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleConfirm}
                    >
                        {options?.confirmText ?? "Confirm"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
});

ControllableAlertDialog.displayName = "ControllableAlertDialog";
