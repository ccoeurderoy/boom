'use strict';

// Load modules

const Code = require('code');
const HttpError = require('../lib');
const Lab = require('lab');


// Declare internals

const internals = {};


// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;


describe('HttpError', () => {

    it('constructs error object (new)', () => {

        const err = new HttpError('oops', { statusCode: 400 });
        expect(err.output.payload.message).to.equal('oops');
        expect(err.output.payload.code).to.equal('BAD_REQUEST');
        expect(err.output.statusCode).to.equal(400);
    });

    it('clones error object', () => {

        const oops = new Error('oops');
        const err = new HttpError(oops, { statusCode: 400 });
        expect(err).to.not.shallow.equal(oops);
        expect(err.output.payload.message).to.equal('oops');
        expect(err.output.statusCode).to.equal(400);
    });

    it('decorates error', () => {

        const err = new HttpError('oops', { statusCode: 400, decorate: { x: 1 } });
        expect(err.output.payload.message).to.equal('oops');
        expect(err.output.statusCode).to.equal(400);
        expect(err.x).to.equal(1);
    });

    it('throws when statusCode is not a number', () => {

        expect(() => {

            new HttpError('message', { statusCode: 'x' });
        }).to.throw('First argument must be a number (400+): x');
    });

    it('will cast a number-string to an integer', () => {

        const codes = [
            { input: '404', result: 404 },
            { input: '404.1', result: 404 },
            { input: 400, result: 400 },
            { input: 400.123, result: 400 }
        ];

        for (let i = 0; i < codes.length; ++i) {
            const code = codes[i];
            const err = new HttpError('', { statusCode: code.input });
            expect(err.output.statusCode).to.equal(code.result);
        }
    });

    it('throws when statusCode is not finite', () => {

        expect(() => {

            new HttpError('', { statusCode: 1 / 0 });
        }).to.throw('First argument must be a number (400+): null');
    });

    it('sets error code to unknown', () => {

        const err = new HttpError('', { statusCode: 999 });
        expect(err.output.payload.error).to.equal('Unknown');
    });

    describe('instanceof', () => {

        it('identifies a boom object', () => {

            expect(new HttpError('oops') instanceof HttpError).to.be.true();
            expect(HttpError.badRequest('oops') instanceof HttpError).to.be.true();
            expect(new Error('oops') instanceof HttpError).to.be.false();
            expect(HttpError.boomify(new Error('oops')) instanceof HttpError).to.be.true();
            expect({ isHttpError: true } instanceof HttpError).to.be.false();
            expect(null instanceof HttpError).to.be.false();
        });
    });

    describe('isHttpError()', () => {

        it('identifies a boom object', () => {

            expect(HttpError.isHttpError(new HttpError('oops'))).to.be.true();
            expect(HttpError.isHttpError(new Error('oops'))).to.be.false();
            expect(HttpError.isHttpError({ isHttpError: true })).to.be.false();
            expect(HttpError.isHttpError(null)).to.be.false();
        });
    });

    describe('boomify()', () => {

        it('returns the same object when already boom', () => {

            const error = HttpError.badRequest();
            expect(error).to.equal(HttpError.boomify(error));
            expect(error).to.equal(HttpError.boomify(error, { statusCode: 444 }));
        });

        it('decorates error', () => {

            const err = new Error('oops');
            HttpError.boomify(err, { statusCode: 400, decorate: { x: 1 } });
            expect(err.x).to.equal(1);
        });

        it('returns an error with info when constructed using another error', () => {

            const error = new Error('ka-boom');
            error.xyz = 123;
            const err = HttpError.boomify(error);
            expect(err.xyz).to.equal(123);
            expect(err.message).to.equal('ka-boom');
            expect(err.output).to.equal({
                statusCode: 500,
                payload: {
                    statusCode: 500,
                    error: 'Internal Server Error',
                    message: 'An internal server error occurred',
                    code: 'INTERNAL_SERVER_ERROR'
                },
                headers: {}
            });
            expect(err.data).to.equal(null);
        });

        it('does not override data when constructed using another error', () => {

            const error = new Error('ka-boom');
            error.data = { useful: 'data' };
            const err = HttpError.boomify(error);
            expect(err.data).to.equal(error.data);
        });

        it('sets new message when none exists', () => {

            const error = new Error();
            const wrapped = HttpError.boomify(error, { statusCode: 400, message: 'something bad' });
            expect(wrapped.message).to.equal('something bad');
        });

        it('returns boom error unchanged', () => {

            const error = HttpError.badRequest('Missing data', { type: 'user' });
            const boom = HttpError.boomify(error);

            expect(boom).to.shallow.equal(error);
            expect(error.data.type).to.equal('user');
            expect(error.output.payload.message).to.equal('Missing data');
            expect(error.output.statusCode).to.equal(400);
        });

        it('defaults to 500', () => {

            const error = new Error('Missing data');
            const boom = HttpError.boomify(error);

            expect(boom).to.shallow.equal(error);
            expect(error.output.payload.message).to.equal('An internal server error occurred');
            expect(error.output.statusCode).to.equal(500);
        });

        it('overrides message and statusCode', () => {

            const error = HttpError.badRequest('Missing data', { type: 'user' });
            const boom = HttpError.boomify(error, { message: 'Override message', statusCode: 599 });

            expect(boom).to.shallow.equal(error);
            expect(error.data.type).to.equal('user');
            expect(error.output.payload.message).to.equal('Override message: Missing data');
            expect(error.output.statusCode).to.equal(599);
        });

        it('overrides message', () => {

            const error = HttpError.badRequest('Missing data', { type: 'user' });
            const boom = HttpError.boomify(error, { message: 'Override message' });

            expect(boom).to.shallow.equal(error);
            expect(error.data.type).to.equal('user');
            expect(error.output.payload.message).to.equal('Override message: Missing data');
            expect(error.output.statusCode).to.equal(400);
        });

        it('overrides statusCode', () => {

            const error = HttpError.badRequest('Missing data', { type: 'user' });
            const boom = HttpError.boomify(error, { statusCode: 599 });

            expect(boom).to.shallow.equal(error);
            expect(error.data.type).to.equal('user');
            expect(error.output.payload.message).to.equal('Missing data');
            expect(error.output.statusCode).to.equal(599);
        });

        it('skips override', () => {

            const error = HttpError.badRequest('Missing data', { type: 'user' });
            const boom = HttpError.boomify(error, { message: 'Override message', statusCode: 599, override: false });

            expect(boom).to.shallow.equal(error);
            expect(error.data.type).to.equal('user');
            expect(error.output.payload.message).to.equal('Missing data');
            expect(error.output.statusCode).to.equal(400);
        });

        it('initializes plain error', () => {

            const error = new Error('Missing data');
            const boom = HttpError.boomify(error, { message: 'Override message', statusCode: 599, override: false });

            expect(boom).to.shallow.equal(error);
            expect(error.output.payload.message).to.equal('Override message: Missing data');
            expect(error.output.statusCode).to.equal(599);
        });
    });

    describe('create()', () => {

        it('does not sets null message', () => {

            const error = HttpError.unauthorized(null);
            expect(error.output.payload.message).to.equal('Unauthorized');
            expect(error.isServer).to.be.false();
        });

        it('sets message and data', () => {

            const error = HttpError.badRequest('Missing data', { type: 'user' });
            expect(error.data.type).to.equal('user');
            expect(error.output.payload.message).to.equal('Missing data');
        });
    });

    describe('initialize()', () => {

        it('does not sets null message', () => {

            const err = new Error('some error message');
            const boom = HttpError.boomify(err, { statusCode: 400, message: 'modified error message' });
            expect(boom.output.payload.message).to.equal('modified error message: some error message');
        });
    });

    describe('isHttpError()', () => {

        it('returns true for HttpError object', () => {

            expect(HttpError.badRequest().isHttpError).to.equal(true);
        });

        it('returns false for Error object', () => {

            expect((new Error()).isHttpError).to.not.exist();
        });
    });

    describe('badRequest()', () => {

        it('returns a 400 error statusCode', () => {

            const error = HttpError.badRequest();

            expect(error.output.statusCode).to.equal(400);
            expect(error.isServer).to.be.false();
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.badRequest('my message').message).to.equal('my message');
        });

        it('sets the message to HTTP status if none provided', () => {

            expect(HttpError.badRequest().message).to.equal('Bad Request');
        });
    });

    describe('unauthorized()', () => {

        it('returns a 401 error statusCode', () => {

            const err = HttpError.unauthorized();
            expect(err.output.statusCode).to.equal(401);
            expect(err.output.headers).to.equal({});
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.unauthorized('my message').message).to.equal('my message');
        });

        it('returns a WWW-Authenticate header when passed a scheme', () => {

            const err = HttpError.unauthorized('boom', 'Test');
            expect(err.output.statusCode).to.equal(401);
            expect(err.output.headers['WWW-Authenticate']).to.equal('Test error="boom"');
        });

        it('returns a WWW-Authenticate header set to the schema array value', () => {

            const err = HttpError.unauthorized(null, ['Test', 'one', 'two']);
            expect(err.output.statusCode).to.equal(401);
            expect(err.output.headers['WWW-Authenticate']).to.equal('Test, one, two');
        });

        it('returns a WWW-Authenticate header when passed a scheme and attributes', () => {

            const err = HttpError.unauthorized('boom', 'Test', { a: 1, b: 'something', c: null, d: 0 });
            expect(err.output.statusCode).to.equal(401);
            expect(err.output.headers['WWW-Authenticate']).to.equal('Test a="1", b="something", c="", d="0", error="boom"');
            expect(err.output.payload.attributes).to.equal({ a: 1, b: 'something', c: '', d: 0, error: 'boom' });
        });

        it('returns a WWW-Authenticate header from string input instead of object', () => {

            const err = HttpError.unauthorized(null, 'Negotiate', 'VGhpcyBpcyBhIHRlc3QgdG9rZW4=');
            expect(err.output.statusCode).to.equal(401);
            expect(err.output.headers['WWW-Authenticate']).to.equal('Negotiate VGhpcyBpcyBhIHRlc3QgdG9rZW4=');
            expect(err.output.payload.attributes).to.equal('VGhpcyBpcyBhIHRlc3QgdG9rZW4=');
        });

        it('returns a WWW-Authenticate header when passed attributes, missing error', () => {

            const err = HttpError.unauthorized(null, 'Test', { a: 1, b: 'something', c: null, d: 0 });
            expect(err.output.statusCode).to.equal(401);
            expect(err.output.headers['WWW-Authenticate']).to.equal('Test a="1", b="something", c="", d="0"');
            expect(err.isMissing).to.equal(true);
        });

        it('sets the isMissing flag when error message is empty', () => {

            const err = HttpError.unauthorized('', 'Basic');
            expect(err.isMissing).to.equal(true);
        });

        it('does not set the isMissing flag when error message is not empty', () => {

            const err = HttpError.unauthorized('message', 'Basic');
            expect(err.isMissing).to.equal(undefined);
        });

        it('sets a WWW-Authenticate when passed as an array', () => {

            const err = HttpError.unauthorized('message', ['Basic', 'Example e="1"', 'Another x="3", y="4"']);
            expect(err.output.headers['WWW-Authenticate']).to.equal('Basic, Example e="1", Another x="3", y="4"');
        });
    });


    describe('paymentRequired()', () => {

        it('returns a 402 error statusCode', () => {

            expect(HttpError.paymentRequired().output.statusCode).to.equal(402);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.paymentRequired('my message').message).to.equal('my message');
        });

        it('sets the message to HTTP status if none provided', () => {

            expect(HttpError.paymentRequired().message).to.equal('Payment Required');
        });
    });


    describe('methodNotAllowed()', () => {

        it('returns a 405 error statusCode', () => {

            expect(HttpError.methodNotAllowed().output.statusCode).to.equal(405);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.methodNotAllowed('my message').message).to.equal('my message');
        });

        it('returns an Allow header when passed a string', () => {

            const err = HttpError.methodNotAllowed('my message', null, 'GET');
            expect(err.output.statusCode).to.equal(405);
            expect(err.output.headers.Allow).to.equal('GET');
        });

        it('returns an Allow header when passed an array', () => {

            const err = HttpError.methodNotAllowed('my message', null, ['GET', 'POST']);
            expect(err.output.statusCode).to.equal(405);
            expect(err.output.headers.Allow).to.equal('GET, POST');
        });
    });


    describe('notAcceptable()', () => {

        it('returns a 406 error statusCode', () => {

            expect(HttpError.notAcceptable().output.statusCode).to.equal(406);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.notAcceptable('my message').message).to.equal('my message');
        });
    });


    describe('proxyAuthRequired()', () => {

        it('returns a 407 error statusCode', () => {

            expect(HttpError.proxyAuthRequired().output.statusCode).to.equal(407);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.proxyAuthRequired('my message').message).to.equal('my message');
        });
    });


    describe('clientTimeout()', () => {

        it('returns a 408 error statusCode', () => {

            expect(HttpError.clientTimeout().output.statusCode).to.equal(408);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.clientTimeout('my message').message).to.equal('my message');
        });
    });


    describe('conflict()', () => {

        it('returns a 409 error statusCode', () => {

            expect(HttpError.conflict().output.statusCode).to.equal(409);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.conflict('my message').message).to.equal('my message');
        });
    });


    describe('resourceGone()', () => {

        it('returns a 410 error statusCode', () => {

            expect(HttpError.resourceGone().output.statusCode).to.equal(410);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.resourceGone('my message').message).to.equal('my message');
        });
    });


    describe('lengthRequired()', () => {

        it('returns a 411 error statusCode', () => {

            expect(HttpError.lengthRequired().output.statusCode).to.equal(411);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.lengthRequired('my message').message).to.equal('my message');
        });
    });


    describe('preconditionFailed()', () => {

        it('returns a 412 error statusCode', () => {

            expect(HttpError.preconditionFailed().output.statusCode).to.equal(412);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.preconditionFailed('my message').message).to.equal('my message');
        });
    });


    describe('entityTooLarge()', () => {

        it('returns a 413 error statusCode', () => {

            expect(HttpError.entityTooLarge().output.statusCode).to.equal(413);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.entityTooLarge('my message').message).to.equal('my message');
        });
    });


    describe('uriTooLong()', () => {

        it('returns a 414 error statusCode', () => {

            expect(HttpError.uriTooLong().output.statusCode).to.equal(414);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.uriTooLong('my message').message).to.equal('my message');
        });
    });


    describe('unsupportedMediaType()', () => {

        it('returns a 415 error statusCode', () => {

            expect(HttpError.unsupportedMediaType().output.statusCode).to.equal(415);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.unsupportedMediaType('my message').message).to.equal('my message');
        });
    });


    describe('rangeNotSatisfiable()', () => {

        it('returns a 416 error statusCode', () => {

            expect(HttpError.rangeNotSatisfiable().output.statusCode).to.equal(416);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.rangeNotSatisfiable('my message').message).to.equal('my message');
        });
    });


    describe('expectationFailed()', () => {

        it('returns a 417 error statusCode', () => {

            expect(HttpError.expectationFailed().output.statusCode).to.equal(417);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.expectationFailed('my message').message).to.equal('my message');
        });
    });


    describe('teapot()', () => {

        it('returns a 418 error statusCode', () => {

            expect(HttpError.teapot().output.statusCode).to.equal(418);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.teapot('Sorry, no coffee...').message).to.equal('Sorry, no coffee...');
        });
    });


    describe('badData()', () => {

        it('returns a 422 error statusCode', () => {

            const err = HttpError.badData();
            expect(err.output.statusCode).to.equal(422);
            expect(err.code).to.equal('UNPROCESSABLE_ENTITY');
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.badData('my message').message).to.equal('my message');
        });
    });


    describe('locked()', () => {

        it('returns a 423 error statusCode', () => {

            expect(HttpError.locked().output.statusCode).to.equal(423);
            expect(HttpError.locked().code).to.equal('LOCKED');
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.locked('my message').message).to.equal('my message');
        });
    });

    describe('failedDependency()', () => {

        it('returns a 424 error statusCode', () => {

            expect(HttpError.failedDependency().output.statusCode).to.equal(424);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.failedDependency('my message').message).to.equal('my message');
        });
    });


    describe('preconditionRequired()', () => {

        it('returns a 428 error statusCode', () => {

            expect(HttpError.preconditionRequired().output.statusCode).to.equal(428);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.preconditionRequired('my message').message).to.equal('my message');
        });
    });


    describe('tooManyRequests()', () => {

        it('returns a 429 error statusCode', () => {

            expect(HttpError.tooManyRequests().output.statusCode).to.equal(429);
        });

        it('sets the message with the passed-in message', () => {

            expect(HttpError.tooManyRequests('my message').message).to.equal('my message');
        });
    });


    describe('illegal()', () => {

        it('returns a 451 error statusCode', () => {

            expect(HttpError.illegal().output.statusCode).to.equal(451);
        });

        it('sets the message with the passed-in message', () => {

            expect(HttpError.illegal('my message').message).to.equal('my message');
        });
    });

    describe('serverUnavailable()', () => {

        it('returns a 503 error statusCode', () => {

            expect(HttpError.serverUnavailable().output.statusCode).to.equal(503);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.serverUnavailable('my message').message).to.equal('my message');
        });
    });

    describe('forbidden()', () => {

        it('returns a 403 error statusCode', () => {

            expect(HttpError.forbidden().output.statusCode).to.equal(403);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.forbidden('my message').message).to.equal('my message');
        });
    });

    describe('notFound()', () => {

        it('returns a 404 error statusCode', () => {

            expect(HttpError.notFound().output.statusCode).to.equal(404);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.notFound('my message').message).to.equal('my message');
        });
    });

    describe('internal()', () => {

        it('returns a 500 error statusCode', () => {

            expect(HttpError.internal().output.statusCode).to.equal(500);
        });

        it('sets the message with the passed in message', () => {

            const err = HttpError.internal('my message');
            expect(err.message).to.equal('my message');
            expect(err.isServer).to.true();
            expect(err.output.payload.message).to.equal('An internal server error occurred');
        });

        it('passes data on the callback if its passed in', () => {

            expect(HttpError.internal('my message', { my: 'data' }).data.my).to.equal('data');
        });

        it('returns an error with composite message', () => {

            const x = {};

            try {
                x.foo();
            }
            catch (err) {
                const boom = HttpError.internal('Someting bad', err);
                expect(boom.message).to.equal('Someting bad: x.foo is not a function');
                expect(boom.isServer).to.be.true();
            }
        });
    });

    describe('notImplemented()', () => {

        it('returns a 501 error statusCode', () => {

            expect(HttpError.notImplemented().output.statusCode).to.equal(501);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.notImplemented('my message').message).to.equal('my message');
        });
    });

    describe('badGateway()', () => {

        it('returns a 502 error statusCode', () => {

            expect(HttpError.badGateway().output.statusCode).to.equal(502);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.badGateway('my message').message).to.equal('my message');
        });

        it('retains source boom error as data when wrapped', () => {

            const upstream = HttpError.serverUnavailable();
            const boom = HttpError.badGateway('Upstream error', upstream);
            expect(boom.output.statusCode).to.equal(502);
            expect(boom.data).to.equal(upstream);
        });
    });

    describe('gatewayTimeout()', () => {

        it('returns a 504 error statusCode', () => {

            expect(HttpError.gatewayTimeout().output.statusCode).to.equal(504);
        });

        it('sets the message with the passed in message', () => {

            expect(HttpError.gatewayTimeout('my message').message).to.equal('my message');
        });
    });

    describe('badImplementation()', () => {

        it('returns a 500 error statusCode', () => {

            const err = HttpError.badImplementation();
            expect(err.output.statusCode).to.equal(500);
            expect(err.isDeveloperError).to.equal(true);
            expect(err.isServer).to.be.true();
        });

        it('hides error from user when error data is included', () => {

            const err = HttpError.badImplementation('Invalid', new Error('kaboom'));
            expect(err.output).to.equal({
                headers: {},
                statusCode: 500,
                payload: {
                    error: 'Internal Server Error',
                    message: 'An internal server error occurred',
                    statusCode: 500,
                    code: 'INTERNAL_SERVER_ERROR'
                }
            });
        });

        it('hides error from user when error data is included (boom)', () => {

            const err = HttpError.badImplementation('Invalid', HttpError.badRequest('kaboom'));
            expect(err.isDeveloperError).to.equal(true);
            expect(err.output).to.equal({
                headers: {},
                statusCode: 500,
                payload: {
                    error: 'Internal Server Error',
                    message: 'An internal server error occurred',
                    statusCode: 500,
                    code: 'INTERNAL_SERVER_ERROR'
                }
            });
        });
    });

    describe('stack trace', () => {

        it('should omit lib', () => {

            ['badRequest', 'unauthorized', 'forbidden', 'notFound', 'methodNotAllowed',
                'notAcceptable', 'proxyAuthRequired', 'clientTimeout', 'conflict',
                'resourceGone', 'lengthRequired', 'preconditionFailed', 'entityTooLarge',
                'uriTooLong', 'unsupportedMediaType', 'rangeNotSatisfiable', 'expectationFailed',
                'badData', 'preconditionRequired', 'tooManyRequests',

                // 500s
                'internal', 'notImplemented', 'badGateway', 'serverUnavailable',
                'gatewayTimeout', 'badImplementation'
            ].forEach((name) => {

                const err = HttpError[name]();
                expect(err.stack).to.not.match(/\/lib\/index\.js/);
            });
        });
    });

    describe('method with error object instead of message', () => {

        [
            'badRequest',
            'unauthorized',
            'forbidden',
            'notFound',
            'methodNotAllowed',
            'notAcceptable',
            'proxyAuthRequired',
            'clientTimeout',
            'conflict',
            'resourceGone',
            'lengthRequired',
            'preconditionFailed',
            'entityTooLarge',
            'uriTooLong',
            'unsupportedMediaType',
            'rangeNotSatisfiable',
            'expectationFailed',
            'badData',
            'preconditionRequired',
            'tooManyRequests',
            'internal',
            'notImplemented',
            'badGateway',
            'serverUnavailable',
            'gatewayTimeout',
            'badImplementation'
        ].forEach((name) => {

            it(`should allow \`HttpError.${name}(err)\` and preserve the error`, () => {

                const error = new Error('An example mongoose validation error');
                error.name = 'ValidationError';
                const err = HttpError[name](error);
                expect(err.name).to.equal('ValidationError');
                expect(err.message).to.equal('An example mongoose validation error');
            });

            // exclude unauthorized

            if (name !== 'unauthorized') {

                it(`should allow \`HttpError.${name}(err, data)\` and preserve the data`, () => {

                    const error = new Error();
                    const err = HttpError[name](error, { foo: 'bar' });
                    expect(err.data).to.equal({ foo: 'bar' });
                });
            }
        });
    });

    describe('error.typeof', () => {

        const types = [
            'badRequest',
            'unauthorized',
            'forbidden',
            'notFound',
            'methodNotAllowed',
            'notAcceptable',
            'proxyAuthRequired',
            'clientTimeout',
            'conflict',
            'resourceGone',
            'lengthRequired',
            'preconditionFailed',
            'entityTooLarge',
            'uriTooLong',
            'unsupportedMediaType',
            'rangeNotSatisfiable',
            'expectationFailed',
            'badData',
            'preconditionRequired',
            'tooManyRequests',
            'internal',
            'notImplemented',
            'badGateway',
            'serverUnavailable',
            'gatewayTimeout',
            'badImplementation'
        ];

        types.forEach((name) => {

            it(`matches typeof HttpError.${name}`, () => {

                const error = HttpError[name]();
                types.forEach((type) => {

                    if (type === name) {
                        expect(error.typeof).to.equal(HttpError[name]);
                    }
                    else {
                        expect(error.typeof).to.not.equal(HttpError[type]);
                    }
                });
            });
        });
    });
});
