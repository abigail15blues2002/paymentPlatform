import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildResponse, parseInput } from './lib/apigateway';
import { createPayment, Payment } from './lib/payments';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const input = parseInput(event.body || '{}') as Omit<Payment, 'id'> & Partial<Pick<Payment, 'id'>>;
        // Ignore user supplied id and generate a new id using UUID (#)
        const payment: Payment = {
            ...input,
            id: uuidv4(),
        };
        await createPayment(payment);
        return buildResponse(201, { result: payment.id });
    } catch (error: any) {
        // Validate errors (#4)
        if (error.message && (
            error.message.includes('Invalid payment object') ||
            error.message.includes('Amount must be greater than 0') ||
            error.message.includes('Unsupported currency')
        )) {
            return buildResponse(422, { message: error.message });
        }
        // Log errors
        console.error('Error in createPayment handler:', error);
        return buildResponse(500, { message: 'Internal server error' });
    }
};
