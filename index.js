const Store = require('./libs/store.js');

module.exports = (opts = {}) => {
    const { key = "koa:sess", store = new Store(), ctxKey = 'session'} = opts;
    let cKey = ''
    if (typeof ctxKey !== 'string' || ctxKey.trim().length === 0 ) cKey = 'session'
    cKey = ctxKey.trim()

    let forceRenew = !!opts.forceRenew
    delete opts.forceRenew

    return async (ctx, next) => {
        let id = ctx.cookies.get(key, opts);

        if(!id) {
            ctx[cKey] = {};
        } else {
            ctx[cKey] = await store.get(id, ctx);
            // check session must be a no-null object
            if(typeof ctx[cKey] !== "object" || ctx[cKey] == null) {
                ctx[cKey] = {};
            }
        }

        const old = JSON.stringify(ctx[cKey]);
        ctx.sid = ctx.sid || {}
        ctx.sid[cKey] = id

        await next();
        
        const sess = JSON.stringify(ctx[cKey]);
        
        // if not changed
        if(old == sess && !forceRenew) return;

        // if is an empty object
        if(sess == '{}') {
            ctx[cKey] = null;
        }

        // need clear old session
        if(id && !ctx[cKey]) {
            await store.destroy(id, ctx);
            ctx.cookies.set(key, null);
            return;
        }

        // set/update session
        const sid = await store.set(ctx[cKey], Object.assign({}, opts, {sid: id}), ctx);
        ctx.cookies.set(key, sid, opts);
    }
}

// Reeexport Store to not use reference to internal files
module.exports.Store = Store;
