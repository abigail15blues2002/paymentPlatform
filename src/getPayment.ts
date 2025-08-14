import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPayment } from './lib/payments';import { validate as validateUUID } from 'uuid';
import { buildCachedResponse, buildNoCacheResponse } from './lib/apigateway';
import { generateETag } from './lib/apigateway';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let paymentId = undefined;
    try {
        paymentId = event.pathParameters?.id;
        if (!paymentId) {
            return buildNoCacheResponse(400, { message: 'Missing payment id' });
        }
        // Check for valid UUID
        if (!validateUUID(paymentId)) {
            return buildNoCacheResponse(400, { message: 'Invalid payment id format' });
        }
        const payment = await getPayment(paymentId);
        if (!payment) {
            return buildNoCacheResponse(404, { message: 'Payment not found' });
        }

        // If-None-Match header for caching case
        const ifNoneMatch = event.headers?.['If-None-Match'];
        const etag = generateETag(payment);
        
        // Compare with generated etag and return proper 304
        if (ifNoneMatch && ifNoneMatch === etag) {
            return {
                statusCode: 304,
                body: '', // Must be empty for 304
                headers: {
                    'ETag': etag,
                    'Cache-Control': 'public, max-age=300'
                }
            };
        }

        return buildCachedResponse(200, payment);
    } catch (error) {
        // Log paymentId for debugging
        console.error('Error in getPayment handler:', { error, paymentId });
        return buildNoCacheResponse(500, { message: 'Internal server error' });

    }
};
