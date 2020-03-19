const Store = require('./libs/store.js')
const signature = require('cookie-signature')

module.exports = (opts = {}) => {
  const { key = 'koa:sess', store = new Store(), ctxKey = 'session' } = opts
  let cKey = ''
  if (typeof ctxKey !== 'string' || ctxKey.trim().length === 0) cKey = 'session'
  cKey = ctxKey.trim()

  let forceRenew = !!opts.forceRenew
  delete opts.forceRenew

  let secret = ''
  if ('secret' in opts && typeof opts.secret === 'string' && opts.secret.length > 0) secret = opts.secret
  delete opts.secret

  return async (ctx, next) => {
    let id = ctx.cookies.get(key, opts)

    // check sid is signed and unsign
    if (secret !== '') {
      try {
        id = decodeURIComponent(id)
      } catch (err) {}
      if (id.substr(0, 2) === 's:') {
        // id is signed
        id = signature.unsign(id.slice(2), secret)
      }
    }

    if (!id) {
      ctx[cKey] = {}
    } else {
      ctx[cKey] = await store.get(id, ctx)
      // check session must be a no-null object
      if (typeof ctx[cKey] !== 'object' || ctx[cKey] == null) {
        ctx[cKey] = {}
      }
    }

    const old = JSON.stringify(ctx[cKey])
    ctx.sid = ctx.sid || {}
    ctx.sid[cKey] = id

    await next()

    const sess = JSON.stringify(ctx[cKey])

    // if not changed
    if (old == sess && !forceRenew) return // eslint-disable-line

    // if is an empty object
    if (sess === '{}') {
      ctx[cKey] = null
    }

    // need clear old session
    if (id && !ctx[cKey]) {
      await store.destroy(id, ctx)
      ctx.cookies.set(key, null)
      return
    }
    // no data and no id skip create session data
    if (!id && !ctx[cKey]) return

    // set/update session
    let sid = await store.set(ctx[cKey], Object.assign({}, opts, { sid: id }), ctx)
    if (secret !== '') {
      sid = encodeURIComponent(signature.sign(sid, secret))
    }
    ctx.cookies.set(key, sid, opts)
  }
}

// Reeexport Store to not use reference to internal files
module.exports.Store = Store
