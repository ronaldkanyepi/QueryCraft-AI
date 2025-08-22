import "next-auth"
import "next-auth/jwt"

type UserRoles = {
    [key: string]: {
        [key: string]: string;
    };
};

declare module "next-auth" {
    interface Profile {
        given_name?: string;
        family_name?: string;
        preferred_username?: string;
        "urn:zitadel:iam:org:project:roles"?: UserRoles;
        locale?: string;
        email_verified?: boolean;
        gender?: string;
        auth_time?: number;
        updated_at?: number;

    }


    interface User {
        id?: string;
        given_name?: string;
        family_name?: string;
        preferred_username?: string;
        roles?: UserRoles;
        locale?: string;
        email_verified?: boolean;
        gender?: string;
        auth_time?: number;
        updated_at?: number;
    }

    interface Session {
        user: User;
        idToken?: string;
        accessToken?:string;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        idToken?: string;
        accessToken?: string;
        given_name?: string;
        family_name?: string;
        preferred_username?: string;
        roles?: UserRoles;
        locale?: string;
        email_verified?: boolean;
        gender?: string;
        auth_time?: number;
        updated_at?: number;
    }
}
