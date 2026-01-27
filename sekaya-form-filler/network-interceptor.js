/**
 * Sekaya Network Interceptor
 * Injected into the page context to monitor API calls.
 */
(function() {
    console.log('🛡️ Sekaya Network Interceptor Initialized');

    // Helper for debugging
    function debugAuth(headers, context) {
        for (const key in headers) {
            if (key.toLowerCase() === 'authorization') {
                console.log(`🔑 [Sekaya Debug] Auth Header Found in ${context}:`, headers[key]);
            }
        }
    }

    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;

    function notify(data) {
        window.postMessage({
            source: 'sekaya-network-interceptor',
            payload: data
        }, '*');
    }

    // --- Monitor Fetch ---
    window.fetch = async function(...args) {
        let url, options;
        
        if (args[0] instanceof Request) {
            url = args[0].url;
            options = {
                method: args[0].method,
                headers: Object.fromEntries(args[0].headers.entries()),
                body: args[0].body
            };
        } else {
            url = args[0];
            options = args[1] || {};
        }

        const method = options.method || 'GET';
        const startTime = Date.now();

        // Normalize headers to a plain object for easy access
        let normalizedHeaders = {};
        if (options.headers) {
            if (options.headers instanceof Headers) {
                normalizedHeaders = Object.fromEntries(options.headers.entries());
            } else if (Array.isArray(options.headers)) {
                options.headers.forEach(([key, val]) => normalizedHeaders[key] = val);
            } else {
                normalizedHeaders = options.headers;
            }
        }

        const requestData = {
            url,
            method,
            type: 'fetch',
            timestamp: startTime,
            requestHeaders: normalizedHeaders,
        };

        // Backup scan: check if Bearer exists anywhere in options
        try {
            const optionsStr = JSON.stringify(options);
            if (optionsStr && optionsStr.toLowerCase().includes('bearer')) {
                findAndNotifyJWT(optionsStr, 'fetch-options');
            }
        } catch (e) {}

        try {
            const response = await originalFetch.apply(this, args);
            const duration = Date.now() - startTime;
            
            const clonedResponse = response.clone();
            let responseBody;
            try {
                const contentType = clonedResponse.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    responseBody = await clonedResponse.json();
                } else {
                    const text = await clonedResponse.text();
                    responseBody = text.substring(0, 10000); // Limit size
                }
            } catch (e) {
                responseBody = '[Unreadable body]';
            }

            debugAuth(requestData.requestHeaders, 'Fetch');
            notify({
                ...requestData,
                status: response.status,
                duration,
                responseBody,
                responseHeaders: Object.fromEntries(response.headers.entries())
            });

            // Extract JWT from response headers
            response.headers.forEach((value, name) => {
                findAndNotifyJWT(value, 'resp-header');
            });

            // Extract JWT from response body if present
            if (responseBody) {
                const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
                findAndNotifyJWT(bodyStr, 'resp-body');
            }

            // Extract JWT if present in Authorization header (Case-Insensitive)
            let authHeader = null;
            for (const key in requestData.requestHeaders) {
                if (key.toLowerCase() === 'authorization') {
                    authHeader = requestData.requestHeaders[key];
                    break;
                }
            }

            if (authHeader) {
                const match = authHeader.match(/^bearer\s+(.+)/i);
                if (match) {
                    const token = match[1].trim();
                    window.postMessage({
                        source: 'sekaya-auth-detector',
                        payload: { token, type: 'header' }
                    }, '*');
                }
            }

            return response;
        } catch (error) {
            notify({
                ...requestData,
                status: 'Error',
                duration: Date.now() - startTime,
                error: error.message
            });
            throw error;
        }
    };

    // --- Monitor XHR ---
    window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const startTime = Date.now();
        let method, url, requestHeaders = {};

        const originalOpen = xhr.open;
        xhr.open = function(m, u) {
            method = m;
            url = u;
            return originalOpen.apply(this, arguments);
        };

        const originalSetRequestHeader = xhr.setRequestHeader;
        xhr.setRequestHeader = function(header, value) {
            requestHeaders[header] = value;
            return originalSetRequestHeader.apply(this, arguments);
        };

        const originalSend = xhr.send;
        xhr.send = function(body) {
            debugAuth(requestHeaders, 'XHR Send');
            // Check headers right before sending
            let authHeader = null;
            for (const key in requestHeaders) {
                if (key.toLowerCase() === 'authorization') {
                    authHeader = requestHeaders[key];
                    break;
                }
            }
            if (authHeader) {
                const match = authHeader.match(/^bearer\s+(.+)/i);
                if (match) {
                    findAndNotifyJWT(match[1], 'xhr-send-header');
                }
            }
            // Body scan
            if (body && typeof body === 'string') {
                findAndNotifyJWT(body, 'xhr-body');
            }
            return originalSend.apply(this, arguments);
        };

        xhr.addEventListener('load', function() {
            let responseBody;
            try {
                const contentType = xhr.getResponseHeader('Content-Type');
                if (contentType && contentType.includes('application/json')) {
                    responseBody = JSON.parse(xhr.responseText);
                } else {
                    responseBody = xhr.responseText.substring(0, 10000);
                }
            } catch (e) {
                responseBody = xhr.responseText;
            }

            debugAuth(requestHeaders, 'XHR');
            notify({
                url,
                method,
                type: 'xhr',
                timestamp: startTime,
                status: xhr.status,
                duration: Date.now() - startTime,
                requestHeaders,
                responseBody,
                responseHeaders: xhr.getAllResponseHeaders()
            });

            // Extract JWT from response headers
            const allHeaders = xhr.getAllResponseHeaders();
            if (allHeaders) findAndNotifyJWT(allHeaders, 'resp-header');

            // Extract JWT from response body
            if (responseBody) {
                const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
                findAndNotifyJWT(bodyStr, 'resp-body');
            }

            // Extract JWT from XHR headers (Case-Insensitive)
            let authHeader = null;
            for (const key in requestHeaders) {
                if (key.toLowerCase() === 'authorization') {
                    authHeader = requestHeaders[key];
                    break;
                }
            }

            if (authHeader) {
                const match = authHeader.match(/^bearer\s+(.+)/i);
                if (match) {
                    const token = match[1].trim();
                    window.postMessage({
                        source: 'sekaya-auth-detector',
                        payload: { token, type: 'xhr-header' }
                    }, '*');
                }
            }
        });

        xhr.addEventListener('error', function() {
            notify({
                url,
                method,
                type: 'xhr',
                timestamp: startTime,
                status: 'Error',
                duration: Date.now() - startTime,
                requestHeaders
            });
        });

        return xhr;
    };
    
    // Maintain prototype inheritance for XHR
    window.XMLHttpRequest.prototype = originalXHR.prototype;
    Object.keys(originalXHR).forEach(key => {
        window.XMLHttpRequest[key] = originalXHR[key];
    });

    // --- Monitor LocalStorage ---
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        if (value && typeof value === 'string') {
            findAndNotifyJWT(value, 'storage');
        }
        return originalSetItem.apply(this, arguments);
    };

    function findAndNotifyJWT(str, context = 'detected') {
        const jwtRegex = /[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g;
        const matches = str.match(jwtRegex);
        
        if (matches) {
            matches.forEach(token => {
                if (token.length > 50) {
                    console.log(`✅ [Sekaya Interceptor] JWT Pattern Detected in ${context}`);
                    window.postMessage({
                        source: 'sekaya-auth-detector',
                        payload: { token, type: context }
                    }, '*');
                }
            });
        }
    }

    // Initial scan of all storage
    Object.keys(localStorage).forEach(key => findAndNotifyJWT(localStorage.getItem(key), 'storage'));
    Object.keys(sessionStorage).forEach(key => findAndNotifyJWT(sessionStorage.getItem(key), 'storage'));
    
    // Scan cookies
    function scanCookies() {
        const cookies = document.cookie.split('; ');
        cookies.forEach(cookie => {
            const [name, value] = cookie.split('=');
            if (value) findAndNotifyJWT(value, 'cookie');
        });
    }
    
    scanCookies();
    // Periodic background scan for state-based auth (in-memory/cookies)
    setInterval(() => {
        scanCookies();
    }, 5000);

    setInterval(() => {
        console.log('💓 Sekaya Interceptor Heartbeat - Monitoring...');
        if (!window.fetch.toString().includes('normalizedHeaders')) {
            console.warn('⚠️ Sekaya Warning: window.fetch seems to have been overwritten by another script.');
        }
    }, 10000);

    console.log('🛡️ Sekaya Network Interceptor Active');
})();
