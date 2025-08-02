import { DocumentClient } from './dynamodb';
import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Retry helper for DynamoDB operations (handles throttling and transient errors)
async function retryDynamo<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 100): Promise<T> {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (error: any) {
            const isRetryable =
                error?.name === 'ProvisionedThroughputExceededException' ||
                error?.name === 'ThrottlingException' ||
                error?.$retryable === true ||
                error?.code === 'ThrottlingException' ||
                error?.statusCode === 429 ||
                error?.message?.includes('throttl') ||
                error?.message?.includes('rate exceeded');
            if (!isRetryable || attempt >= maxRetries) {
                throw error;
            }
            const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
            await new Promise(res => setTimeout(res, delay));
            attempt++;
        }
    }
}

// Use environment variable for table name, fallback to 'Payments' for local/testing
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'Payments';

export const getPayment = async (paymentId: string): Promise<Payment | null> => {
    try {
        const result = await retryDynamo(() =>
            DocumentClient.send(
                new GetCommand({
                    TableName: PAYMENTS_TABLE,
                    Key: { paymentId },
                })
            )
        );
        return (result.Item as Payment) || null;
    } catch (error) {
        console.error('Error getting payment:', error);
        throw new Error('Failed to get payment');
    }
};

export const listPayments = async (currency?: string): Promise<Payment[]> => {
    try {
        const params: any = {
            TableName: PAYMENTS_TABLE,
        };
        if (currency) {
            params.FilterExpression = '#currency = :currency';
            params.ExpressionAttributeNames = { '#currency': 'currency' };
            params.ExpressionAttributeValues = { ':currency': currency };
        }
        const result = await retryDynamo(() =>
            DocumentClient.send(
                new ScanCommand(params)
            )
        );
        return (result.Items as Payment[]) || [];
    } catch (error) {
        console.error('Error listing payments:', error);
        throw new Error('Failed to list payments');
    }
};

// Supported currency codes from environment variable, fallback to default list
const SUPPORTED_CURRENCIES = (process.env.SUPPORTED_CURRENCIES || 'AUD,USD,EUR,GBP,SGD,NZD,CAD')
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);

export const createPayment = async (payment: Payment) => {
    // Advanced input validation
    if (!payment.id || typeof payment.amount !== 'number' || !payment.currency) {
        throw new Error('Invalid payment object');
    }
    if (payment.amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    if (!SUPPORTED_CURRENCIES.includes(payment.currency)) {
        throw new Error('Unsupported currency');
    }
    try {
        await retryDynamo(() =>
            DocumentClient.send(
                new PutCommand({
                    TableName: PAYMENTS_TABLE,
                    Item: payment,
                })
            )
        );
    } catch (error) {
        console.error('Error creating payment:', error);
        throw new Error('Failed to create payment');
    }
};

export type Payment = {
    id: string;
    amount: number;
    currency: string;
};
