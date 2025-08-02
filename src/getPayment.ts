import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPayment } from './lib/payments';


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
        const payment = await getPayment(paymentId);
        if (!payment) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Payment not found' }),
            };
        }
        return {
            statusCode: 200,
            body: JSON.stringify(payment),
        };
    } catch (error) {
        // Log paymentId for debugging
        console.error('Error in getPayment handler:', { error, paymentId });
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    }
};
