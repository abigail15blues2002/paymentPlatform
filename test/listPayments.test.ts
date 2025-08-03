import { handler } from '../src/listPayments';
import * as payments from '../src/lib/payments';
import { APIGatewayProxyEvent } from 'aws-lambda';

const buildEvent = (queryStringParameters?: object) => ({ queryStringParameters } as unknown as APIGatewayProxyEvent);

describe('listPayments handler', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('returns all payments when no currency is specified', async () => {
        const mockPayments = [
            { id: '1', amount: 100, currency: 'AUD' },
            { id: '2', amount: 200, currency: 'USD' },
        ];
        const listPaymentsMock = jest.spyOn(payments, 'listPayments').mockResolvedValueOnce(mockPayments);
        const event = buildEvent();
        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({ data: mockPayments });
        expect(listPaymentsMock).toHaveBeenCalledWith(undefined);
    });

    it('returns filtered payments when currency is specified', async () => {
        const mockPayments = [
            { id: '3', amount: 300, currency: 'SGD' },
        ];
        const listPaymentsMock = jest.spyOn(payments, 'listPayments').mockResolvedValueOnce(mockPayments);
        const event = buildEvent({ currency: 'SGD' });
        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({ data: mockPayments });
        expect(listPaymentsMock).toHaveBeenCalledWith('SGD');
    });

    it('returns an empty array if no payments found', async () => {
        const listPaymentsMock = jest.spyOn(payments, 'listPayments').mockResolvedValueOnce([]);
        const event = buildEvent({ currency: 'EUR' });
        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({ data: [] });
        expect(listPaymentsMock).toHaveBeenCalledWith('EUR');
    });
});
