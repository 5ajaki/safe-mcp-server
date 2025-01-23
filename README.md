# Safe MCP Server

An MCP (Model Context Protocol) server implementation for interacting with Safe (formerly Gnosis Safe) smart contract wallets.

## Features

- Query Safe transactions
- Get multisig transaction details
- Decode transaction data
- Safe API integration

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with:

```env
SAFE_API_URL=https://safe-transaction-mainnet.safe.global/api/v1
```

## Usage

```bash
npm start
```

## Available Tools

### getSafeTransactions
Get all transactions for a Safe address.

### getMultisigTransaction
Get details of a specific multisig transaction.

### decodeTransactionData
Decode transaction data using Safe API.

## Development

```bash
npm run build
npm run test
```

## License

MIT