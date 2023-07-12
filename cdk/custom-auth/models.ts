export interface PasswordlessAuthUser {
  username: string;
  email: string;
}

export interface PreInitiateAuthRequestBody {
  userPoolId: string;
  region: string;
  user: PreInitiateAuthUser;
}

export interface PreInitiateAuthUser {
  username: string;
  userAttributes: PreInitiateAuthBodyUserAttributes;
}

interface PreInitiateAuthBodyUserAttributes {
  email?: string;
  phoneNumber?: string;
  [key: string]: string | undefined;
}
