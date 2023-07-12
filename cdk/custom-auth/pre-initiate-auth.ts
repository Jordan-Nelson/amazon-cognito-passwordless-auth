/**
 * Copyright Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You
 * may not use this file except in compliance with the License. A copy of
 * the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */

import { Handler } from "aws-lambda";
import { logger } from "./common.js";
import { PreInitiateAuthRequestBody, PreInitiateAuthUser } from "./models.js";
import { AdminCreateUserCommand, AdminCreateUserCommandInput, AdminGetUserCommand, CognitoIdentityProviderClient, AdminGetUserCommandInput, MessageActionType, UserNotFoundException } from "@aws-sdk/client-cognito-identity-provider";

export const handler: Handler = async (event) => {
  logger.info("Pre-initiate-auth ...");
  logger.debug(JSON.stringify(event, null, 2));
  const body = JSON.parse(event.body) as PreInitiateAuthRequestBody;
  const {user, userPoolId, region} = body;
  await checkUserExists(userPoolId, region, user);
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*"
    },
    body: JSON.stringify({'nextStep': 'initiateAuth'}),
  };
};


async function checkUserExists(userPoolId: string, region: string, user: PreInitiateAuthUser): Promise<void> {
  const client = new CognitoIdentityProviderClient({region: region});
  const getUserParams: AdminGetUserCommandInput = {
    UserPoolId: userPoolId,
    Username: user.username,
  };
  const userExists = await client.send(
    new AdminGetUserCommand(getUserParams)
  ).then((_) => true).catch((error) => {
    if (error instanceof UserNotFoundException) return false;
    logger.debug(`GetUser failed with error: ${error}`);
    throw error;
  })
  if (!userExists) {
    logger.debug(`User not found. Creating User with username: ${user.username}`);
    const createUserParams: AdminCreateUserCommandInput = {
      UserPoolId: userPoolId,
      Username: user.username,
      MessageAction: MessageActionType.SUPPRESS,
    };
    await client.send(
      new AdminCreateUserCommand(createUserParams)
    ).then(async (resp) => {
      logger.debug("User Created!");
      logger.debug(JSON.stringify(resp));
    })
    .catch((reason) => {
      logger.debug(`Failed to create user: ${reason}`);
      throw reason;
    });
  } 
}
