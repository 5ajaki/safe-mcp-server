
Here's the core documentation for the Safe Transaction API endpoints needed for MCP server implementation:

1. Get All Transactions
```
GET /api/v1/safes/{address}/all-transactions/
Query params: 
- limit: int (default 100)
- offset: int
- ordering: string ('-timestamp' or 'timestamp')

Response 200:
{
  "count": int,
  "next": string (url),
  "previous": string (url),
  "results": [
    {
      "txType": string ("MULTISIG_TRANSACTION"|"MODULE_TRANSACTION"|"ETHEREUM_TRANSACTION"),
      "executionDate": datetime,
      "submissionDate": datetime,
      "nonce": int,
      "safeTxHash": string,
      "value": string (decimal),
      "to": string (address),
      "data": string (hex),
      "operation": int (0=CALL, 1=DELEGATE_CALL, 2=CREATE),
      "dataDecoded": {
        "method": string,
        "parameters": array
      },
      "confirmations": [
        {
          "owner": string (address),
          "submissionDate": datetime,
          "signature": string,
          "signatureType": string
        }
      ],
      "trusted": boolean,
      "signatures": string
    }
  ]
}
```

2. Get Multisig Transaction Details
```
GET /api/v1/multisig-transactions/{safe_tx_hash}/

Response 200:
{
  "safe": string (address),
  "to": string (address),
  "value": string (decimal),
  "data": string (hex),
  "operation": int,
  "safeTxGas": int,
  "baseGas": int,
  "gasPrice": string,
  "nonce": int,
  "executionDate": datetime,
  "submissionDate": datetime,
  "modified": datetime,
  "blockNumber": int,
  "transactionHash": string,
  "safeTxHash": string,
  "executor": string (address),
  "isExecuted": boolean,
  "isSuccessful": boolean,
  "dataDecoded": {
    "method": string,
    "parameters": array
  },
  "confirmationsRequired": int,
  "confirmations": array,
  "signatures": string
}
```

3. Decode Transaction Data
```
POST /api/v1/data-decoder/
Request:
{
  "data": string (hex),
  "to": string (address) // optional
}

Response 200:
{
  "method": string,
  "parameters": [
    {
      "name": string,
      "type": string,
      "value": any
    }
  ]
}

Error 404: Cannot find function selector
Error 422: Invalid data
```

Key features to implement:
- Pagination handling
- Transaction type differentiation 
- Signature verification
- ABI-based data decoding
- Confirmation tracking
- Chronological ordering
- Safe address validation