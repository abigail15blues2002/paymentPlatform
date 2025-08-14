import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildResponse } from './lib/apigateway';
import { listPayments } from './lib/payments';
import { buildCachedResponse } from './lib/apigateway';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const currency = event.queryStringParameters?.currency;
    if (!currency) {
        return buildResponse(400, { message: 'Missing currency query parameter' });
    }
    // Validate currency on SUPPORTED CURRENCIES
    const supportedCurrencies = (process.env.SUPPORTED_CURRENCIES || 'AUD,USD,EUR,GBP,SGD,NZD,CAD').split(',');
    if (!supportedCurrencies.includes(currency)) {
        return buildResponse(400, { message: 'Unsupported currency' });
    }
    
    const payments = await listPayments(currency);
    if (!payments || payments.length === 0) {
        return buildResponse(404, { message: 'No payments found for the specified currency' });
    }
    return buildCachedResponse(200, { data: payments }, 120);
};
