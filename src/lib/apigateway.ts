import { APIGatewayProxyResult } from 'aws-lambda';

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

// Simple ETag based on response content
const generateETag = (body: Object): string => {
    const content = JSON.stringify(body);
    // Simple hash function for ETag (not cryptographically secure in production)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
};

export const parseInput = (body: string): Object => {
    try {
        return JSON.parse(body);
    } catch (err) {
        console.error(err);
        return {};
    }
};