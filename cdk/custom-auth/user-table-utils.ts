import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { createHash } from "crypto";

let config = {
  /** The name of the DynamoDB table where (hashes of) user subs will be stored */
  dynamodbUsersTableName: process.env.DYNAMODB_USERS_TABLE,
  /** A salt to use for storing hashes of magic links in the DynamoDB table */
  salt: process.env.STACK_ID,
};

export function requireConfig<K extends keyof typeof config>(
  k: K
): NonNullable<(typeof config)[K]> {
  // eslint-disable-next-line security/detect-object-injection
  const value = config[k];
  if (value === undefined) throw new Error(`Missing configuration for: ${k}`);
  return value;
}

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

/**
 * Adds the user to the table
 */
export async function addUserToTable(userSub: string): Promise<void> {
  await ddbDocClient.send(
    new PutCommand({
      TableName: requireConfig("dynamodbUsersTableName"),
      Item: {
        userSubHash: hash(userSub),
        attribute: "email",
      },
    })
  );
}

/**
 * @returns returns true if the user is in the table, otherwise false
 */
export async function userExistsInTable(userSub: string): Promise<boolean> {
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: requireConfig("dynamodbUsersTableName"),
      Key: { userSubHash: hash(userSub) },
    })
  );
  return !!result.Item;
}

/**
 * Removes the user from the table (if present), and returns true or false
 * @returns true or false depending if the record was present
 */
export async function removeUserFromTable(userSub: string): Promise<boolean> {
  let dbItem: Record<string, unknown> | undefined = undefined;
  ({ Attributes: dbItem } = await ddbDocClient.send(
    new DeleteCommand({
      TableName: requireConfig("dynamodbUsersTableName"),
      Key: { userSubHash: hash(userSub) },
      ReturnValues: "ALL_OLD",
    })
  ));
  return !!dbItem;
}

function hash(userSub: string): Buffer {
  const salt = requireConfig("salt");
  return createHash("sha256").update(salt).end(userSub).digest();
}
