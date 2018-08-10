const Store = require('./libs/store.js');

module.exports = (opts = {}) => {
    const { key = "koa:sess", store = new Store(), cKey = 'session'} = opts;
    let ctxKey = ''
    if (typeof cKey !== 'string' || cKey.trim().length === 0 ) ctxKey = 'session'
    ctxKey = cKey.trim()

    return async (ctx, next) => {
        let id = ctx.cookies.get(key, opts);

        if(!id) {
            ctx[ctxKey] = {};
        } else {
            ctx[ctxKey] = await store.get(id, ctx);
            // check session must be a no-null object
            if(typeof ctx[ctxKey] !== "object" || ctx[ctxKey] == null) {
                ctx[ctxKey] = {};
            }
        }

        const old = JSON.stringify(ctx[ctxKey]);

        await next();
        
        const sess = JSON.stringify(ctx[ctxKey]);
        
        // if not changed
        if(old == sess) return;

        // if is an empty object
        if(sess == '{}') {
            ctx[ctxKey] = null;
        }

        // need clear old session
        if(id && !ctx[ctxKey]) {
            await store.destroy(id, ctx);
            ctx.cookies.set(key, null);
            return;
        }

        // set/update session
        const sid = await store.set(ctx[ctxKey], Object.assign({}, opts, {sid: id}), ctx);
        ctx.cookies.set(key, sid, opts);
    }
}

// Reeexport Store to not use reference to internal files
module.exports.Store = Store;
