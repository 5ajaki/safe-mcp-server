#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
  Request,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "dotenv";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SAFE_API_URL?: string;
    }
  }
}

// Load environment variables
config();

const SAFE_API_URL =
  process.env.SAFE_API_URL ||
  "https://safe-transaction-mainnet.safe.global/api/v1";

interface SafeTransaction {
  txType: string;
  executionDate: string;
  submissionDate: string;
  nonce: number;
  safeTxHash: string;
  value: string;
  to: string;
  data: string;
  operation: number;
  dataDecoded?: {
    method: string;
    parameters: any[];
  };
  confirmations: {
    owner: string;
    submissionDate: string;
    signature: string;
    signatureType: string;
  }[];
  trusted: boolean;
  signatures: string;
}

type ToolCallParams = {
  name: string;
  arguments?: Record<string, unknown>;
};

class SafeMcpServer {
  private server: Server;

  constructor() {
    // Initialize server
    this.server = new Server(
      { name: "safe-mcp", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: Error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async fetchSafeApi(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<any> {
    const url = new URL(`${SAFE_API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `Safe API error: ${response.statusText}`
      );
    }
    return response.json();
  }

  private setupHandlers(): void {
    // Register available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "getSafeTransactions",
          description: "Get all transactions for a Safe address",
          inputSchema: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description: "Safe address",
              },
              limit: {
                type: "number",
                description: "Number of transactions to return",
              },
              offset: {
                type: "number",
                description: "Offset for pagination",
              },
            },
            required: ["address"],
          },
        },
        {
          name: "getMultisigTransaction",
          description: "Get details of a specific multisig transaction",
          inputSchema: {
            type: "object",
            properties: {
              safeTxHash: {
                type: "string",
                description: "Safe transaction hash",
              },
            },
            required: ["safeTxHash"],
          },
        },
        {
          name: "decodeTransactionData",
          description: "Decode transaction data using Safe API",
          inputSchema: {
            type: "object",
            properties: {
              data: {
                type: "string",
                description: "Transaction data in hex format",
              },
              to: {
                type: "string",
                description: "Optional contract address",
              },
            },
            required: ["data"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params as ToolCallParams;

      switch (name) {
        case "getSafeTransactions": {
          const { address, limit = 100, offset = 0 } = args as any;
          const data = await this.fetchSafeApi(
            `/safes/${address}/all-transactions/`,
            {
              limit: limit.toString(),
              offset: offset.toString(),
              ordering: "-timestamp",
            }
          );
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          };
        }

        case "getMultisigTransaction": {
          const { safeTxHash } = args as any;
          const data = await this.fetchSafeApi(
            `/multisig-transactions/${safeTxHash}/`
          );
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          };
        }

        case "decodeTransactionData": {
          const { data, to } = args as any;
          const response = await fetch(`${SAFE_API_URL}/data-decoder/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, to }),
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new McpError(
                ErrorCode.InternalError,
                "Cannot find function selector"
              );
            }
            if (response.status === 422) {
              throw new McpError(ErrorCode.InvalidParams, "Invalid data");
            }
            throw new McpError(
              ErrorCode.InternalError,
              `Decoder API error: ${response.statusText}`
            );
          }

          const decodedData = await response.json();
          return {
            content: [
              { type: "text", text: JSON.stringify(decodedData, null, 2) },
            ],
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Create and start server
const server = new SafeMcpServer();
server.run().catch(console.error);
