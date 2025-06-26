# API Key Verification

## Overview

The API Key Verification endpoint allows you to verify the validity of an API key and retrieve associated user information. This is useful for IDE extensions and integrations that need to validate their API keys before performing operations.

## Endpoint

```
POST /users/:uuid/api-keys/verify
```

**Note**: The `:uuid` parameter in the URL is not used for verification - the API key provided in the header determines which user the key belongs to.

## Request

### Headers
- `X-API-Key` (required): The API key to verify
- `Content-Type: application/json`

### Body
The request body can be empty or contain an empty JSON object `{}`.

## Response

### Success Response (200 OK)

```json
{
  "valid": true,
  "user": {
    "uuid": "b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://example.com/avatar.png",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "providerIdentities": [
      {
        "provider": "google",
        "providerUserId": "1234567890"
      }
    ]
  },
  "apiKeyUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "message": "Missing API key header. Use X-API-Key: <api_key>"
}
```

```json
{
  "message": "Invalid or revoked API key"
}
```

#### 404 Not Found
```json
{
  "message": "User not found"
}
```

#### 500 Internal Server Error
```json
{
  "message": "Internal error: missing context from middleware"
}
```

## Validation Process

The endpoint performs comprehensive validation:

1. **API Key Format**: Validates the header is present and properly formatted
2. **Key Existence**: Verifies the API key exists in the database
3. **Hash Verification**: Uses constant-time comparison to verify the key matches the stored hash
4. **Revocation Check**: Ensures the API key has not been revoked (`revoked_at IS NULL`)
5. **Deletion Check**: Ensures the API key has not been soft-deleted (`deleted_at IS NULL`)
6. **User Status**: Ensures the associated user has not been soft-deleted (`user.deleted_at IS NULL`)
7. **Usage Tracking**: Updates the `last_used_at` timestamp for analytics and monitoring

## Security Features

- **Constant-time comparison**: Prevents timing attacks during key verification
- **Hash-based storage**: API keys are stored as Argon2id hashes, never in plain text
- **Automatic cleanup**: Invalid keys are immediately rejected without exposing system information
- **Usage tracking**: All successful verifications are logged with timestamps

## Use Cases

- **IDE Extensions**: Verify API keys before syncing or performing operations
- **Integration Health Checks**: Validate API keys periodically to ensure they remain active
- **User Information Retrieval**: Get current user data associated with an API key
- **Authentication Debugging**: Troubleshoot API key authentication issues

## Example Usage

### cURL
```bash
curl -X POST \
  'https://api.example.com/users/b3b3b3b3-b3b3-4b3b-b3b3-b3b3b3b3b3b3/api-keys/verify' \
  -H 'X-API-Key: your-api-key-here' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('/users/any-uuid/api-keys/verify', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-api-key-here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
});

const result = await response.json();
if (result.valid) {
  console.log('API key is valid for user:', result.user.name);
} else {
  console.log('API key is invalid');
}
```

## Notes

- The UUID in the URL path (`/users/:uuid/api-keys/verify`) is required for route structure but not used in validation
- You can use any UUID in the path - the actual user is determined by the API key provided in the header
- Successful verification automatically updates the API key's `last_used_at` timestamp
- This endpoint is rate-limited to prevent abuse and brute-force attacks 