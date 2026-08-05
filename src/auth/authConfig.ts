import { Configuration, LogLevel } from "@azure/msal-browser";

// Azure AD Application (client) ID
////const clientId = "bca71dfb-37c6-4752-bcb4-fa44821631d4";
// Azure AD Tenant ID
//const tenantId = "4358c64c-489c-44fa-bc81-8830190face2";

// Azure AD Application (client) ID
const clientId = "0c1adffc-a101-4f13-8416-d36b1d206b98";
// Azure AD Tenant ID
const tenantId = "4b0d9aaa-5aaf-49f7-a8e6-3902a1da7b47";

// Redirect URI after login
const redirectUri = "http://localhost:5173";

/**
 * Configuration object to be passed to Msal on creation.
 * For more info, visit: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
 */
export const msalConfig: Configuration = {
    auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/organizations`,
        redirectUri: redirectUri,
        postLogoutRedirectUri: redirectUri,
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        /// storeAuthStateInCookie: false, // Set this to "true" to maintain backward compatibility with previous MSAL.js versions
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                    default:
                        return;
                }
            },
        },
    },
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const loginRequest = {
    scopes: ["openid", "profile", "email"],
    //  scopes: ["User.Read", "openid", "profile", "email"],
};

/**
 * An "intervention_required" error will be thrown if a user needs to do an interactive token request
 * (to provide consent, do MFA, etc.)
 * For more information, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/acquire-token.md
 */
export const tokenRequest = {
    scopes: ["User.Read"],
};

/**
 * Scopes you add here will be used to request a token for resource access when calling acquireTokenSilent() and acquireTokenPopup().
 * For more information about API permissions, visit:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
 *
 * Learn more about scopes for an API you want to call by checking its documentation.
 * For example:
 * https://docs.microsoft.com/en-us/graph/api/user-list
 */
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};
