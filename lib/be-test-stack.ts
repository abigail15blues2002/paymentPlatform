import * as cdk from 'aws-cdk-lib';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class BeTestStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Dynamo DB table
        const paymentsTable = new Table(this, 'PaymentsTable', {
            tableName: 'PaymentsTable',
            partitionKey: { name: 'id', type: AttributeType.STRING },
        });

        // Add GSI for currency filtering
        paymentsTable.addGlobalSecondaryIndex({
            indexName: 'currency-index',
            partitionKey: { name: 'currency', type: AttributeType.STRING },
            sortKey: { name: 'id', type: AttributeType.STRING }, // Optional: for sorting
        });

        // API
        const paymentsApi = new RestApi(this, 'ofxPaymentsChallenge', {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS, // Specify allowed origins in production
                allowMethods: ['GET', 'POST', 'OPTIONS'],  // Specify allowed methods

            },
            // Specify security headers if needed
        });
        const paymentsResource = paymentsApi.root.addResource('payments');
        const specificPaymentResource = paymentsResource.addResource('{id}');

        // Functions
        const createPaymentFunction = this.createLambda('createPayment', 'src/createPayment.ts', {
            SUPPORTED_CURRENCIES: 'AUD,USD,EUR,GBP,SGD,NZD,CAD',
            PAYMENTS_TABLE: 'PaymentsTable',
        });
        paymentsTable.grantWriteData(createPaymentFunction);
        paymentsResource.addMethod('POST', new LambdaIntegration(createPaymentFunction));

        const getPaymentFunction = this.createLambda('getPayment', 'src/getPayment.ts', {
            PAYMENTS_TABLE: 'PaymentsTable',
        });
        paymentsTable.grantReadData(getPaymentFunction);
        specificPaymentResource.addMethod('GET', new LambdaIntegration(getPaymentFunction));

        const listPaymentsFunction = this.createLambda('listPayments', 'src/listPayments.ts', {
            PAYMENTS_TABLE: 'PaymentsTable',
        });
        paymentsTable.grantReadData(listPaymentsFunction);
        paymentsResource.addMethod('GET', new LambdaIntegration(listPaymentsFunction));
    }

    createLambda = (name: string, path: string, environment: Record<string, string> = {}) => {
        return new NodejsFunction(this, name, {
            functionName: name,
            runtime: Runtime.NODEJS_18_X,
            entry: path,
            environment,
        });
    };
}