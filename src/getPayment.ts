import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPayment } from './lib/payments';import { validate as validateUUID } from 'uuid';
import { buildCachedResponse, buildNoCacheResponse } from './lib/apigateway';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let paymentId = undefined;
    try {
        paymentId = event.pathParameters?.id;
        if (!paymentId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing payment id' }),
            };
        }
        // Check for valid UUID
        if (!validateUUID(paymentId)) {
            return buildNoCacheResponse(400, { message: 'Invalid payment id format' });
        }
        const payment = await getPayment(paymentId);
        if (!payment) {
            return buildNoCacheResponse(404, { message: 'Payment not found' });
        }
        return buildCachedResponse(200, payment);
    } catch (error) {
        // Log paymentId for debugging
        console.error('Error in getPayment handler:', { error, paymentId });
        return buildNoCacheResponse(500, { message: 'Internal server error' });

    }
};
