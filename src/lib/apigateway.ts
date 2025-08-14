import { APIGatewayProxyResult } from 'aws-lambda';
import * as crypto from 'crypto';

interface CacheOptions {
    maxAge?: number; // in seconds
    enableCaching?: boolean;
}

export const buildResponse = (
    statusCode: number, 
    body: Object, 
    cacheOptions?: CacheOptions
): APIGatewayProxyResult => {
    const headers: Record<string, string | boolean> = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
    };

    // Add cache headers if caching is enabled
    if (cacheOptions?.enableCaching && cacheOptions.maxAge) {
        headers['Cache-Control'] = `public, max-age=${cacheOptions.maxAge}`;
        headers['ETag'] = generateETag(body);
    } else {
        // Disable caching for endpoints that shouldn't be cached
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
    }

    return {
        statusCode,
        body: JSON.stringify(body),
        headers,
    };
};

export const buildCachedResponse = (statusCode: number, body: Object, maxAgeSeconds: number = 300): APIGatewayProxyResult => {
    return buildResponse(statusCode, body, { enableCaching: true, maxAge: maxAgeSeconds });
};

export const buildNoCacheResponse = (statusCode: number, body: Object): APIGatewayProxyResult => {
    return buildResponse(statusCode, body, { enableCaching: false });
};

export const generateETag = (body: Object): string => {
    const hash = crypto.createHash('md5').update(JSON.stringify(body)).digest('hex');
    return `"${hash}"`;
};

export const parseInput = (body: string): Object => {
    try {
        return JSON.parse(body);
    } catch (err) {
        console.error(err);
        throw err; // Re-throw the error instead of returning {}
    }
};