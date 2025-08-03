import { handler } from '../src/createPayment';
import * as payments from '../src/lib/payments';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { v4 as uuidv4, validate as validateUUID } from 'uuid';

jest.mock('uuid');

const buildEvent = (body: object) => ({ body: JSON.stringify(body) } as unknown as APIGatewayProxyEvent);

describe('createPayment handler', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('creates a payment and returns 201 with a valid UUID', async () => {
        (uuidv4 as jest.Mock).mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
        const createPaymentMock = jest.spyOn(payments, 'createPayment').mockResolvedValueOnce(undefined);
        const event = buildEvent({ amount: 100, currency: 'AUD', id: 'should-be-ignored' });
        const result = await handler(event);
        expect(result.statusCode).toBe(201);
        const body = JSON.parse(result.body);
        expect(validateUUID(body.result)).toBe(true);
        expect(body.result).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(createPaymentMock).toHaveBeenCalledWith({ amount: 100, currency: 'AUD', id: '123e4567-e89b-12d3-a456-426614174000' });
    });

    it('returns 422 for amount <= 0', async () => {
        const createPaymentMock = jest.spyOn(payments, 'createPayment').mockImplementationOnce(() => { throw new Error('Amount must be greater than 0'); });
        const event = buildEvent({ amount: 0, currency: 'AUD' });
        const result = await handler(event);
        expect(result.statusCode).toBe(422);
        expect(JSON.parse(result.body)).toEqual({ message: 'Amount must be greater than 0' });
        expect(createPaymentMock).toHaveBeenCalled();
    });

    it('returns 422 for unsupported currency', async () => {
        const createPaymentMock = jest.spyOn(payments, 'createPayment').mockImplementationOnce(() => { throw new Error('Unsupported currency'); });
        const event = buildEvent({ amount: 100, currency: 'XYZ' });
        const result = await handler(event);
        expect(result.statusCode).toBe(422);
        expect(JSON.parse(result.body)).toEqual({ message: 'Unsupported currency' });
        expect(createPaymentMock).toHaveBeenCalled();
    });

    it('returns 422 for missing fields', async () => {
        const createPaymentMock = jest.spyOn(payments, 'createPayment').mockImplementationOnce(() => { throw new Error('Invalid payment object'); });
        const event = buildEvent({ currency: 'AUD' });
        const result = await handler(event);
        expect(result.statusCode).toBe(422);
        expect(JSON.parse(result.body)).toEqual({ message: 'Invalid payment object' });
        expect(createPaymentMock).toHaveBeenCalled();
    });

    it('returns 500 for unexpected errors', async () => {
        const createPaymentMock = jest.spyOn(payments, 'createPayment').mockImplementationOnce(() => { throw new Error('DB error'); });
        const event = buildEvent({ amount: 100, currency: 'AUD' });
        const result = await handler(event);
        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({ message: 'Internal server error' });
        expect(createPaymentMock).toHaveBeenCalled();
    });
});
