const SUPABASE_URL = 'https://yxmbammlzweasjvpouqn.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4bWJhbW1sendlYXNqdnBvdXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwOTg0MjgsImV4cCI6MjA5MjY3NDQyOH0.JZfWJcSyGWVQhj2OScCzTpLvEpVly6IQSXfcKQI-YI0';

// Minimal Supabase REST client (no npm SDK — raw fetch)
const sb = {
  _url: SUPABASE_URL,
  _key: SUPABASE_ANON,
  _token: null, // set after login

  headers(extra = {}) {
    const h = {
      apikey: this._key,
      'Content-Type': 'application/json',
      ...extra,
    };
    if (this._token) h['Authorization'] = `Bearer ${this._token}`;
    return h;
  },

  // ── Auth ────────────────────────────────────────────────────────────────
  async signUp(email, password, name) {
    const r = await fetch(`${this._url}/auth/v1/signup`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password, data: { name } }),
    });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${this._url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },
  async signOut() {
    await fetch(`${this._url}/auth/v1/logout`, {
      method: 'POST',
      headers: this.headers(),
    });
    this._token = null;
  },
  async refreshSession(refreshToken) {
    const r = await fetch(`${this._url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return r.json();
  },
  async getUser() {
    if (!this._token) return null;
    const r = await fetch(`${this._url}/auth/v1/user`, { headers: this.headers() });
    if (!r.ok) return null;
    return r.json();
  },

  // ── Generic REST helpers ─────────────────────────────────────────────────
  async select(table, params = '') {
    const r = await fetch(`${this._url}/rest/v1/${table}?${params}`, {
      headers: this.headers({ Prefer: 'return=representation' }),
    });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.message || r.status);
    }
    return r.json();
  },
  async upsert(table, body, onConflict) {
    const qs = onConflict ? `?on_conflict=${onConflict}` : '';
    const r = await fetch(`${this._url}/rest/v1/${table}${qs}`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.message || r.status);
    }
    return r.json();
  },
  async update(table, body, matchCol, matchVal) {
    const r = await fetch(
      `${this._url}/rest/v1/${table}?${matchCol}=eq.${encodeURIComponent(matchVal)}`,
      {
        method: 'PATCH',
        headers: this.headers({ Prefer: 'return=representation' }),
        body: JSON.stringify(body),
      }
    );
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.message || r.status);
    }
    return r.json();
  },
  async delete(table, matchCol, matchVal) {
    const r = await fetch(
      `${this._url}/rest/v1/${table}?${matchCol}=eq.${encodeURIComponent(matchVal)}`,
      { method: 'DELETE', headers: this.headers() }
    );
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.message || r.status);
    }
  },
  async deleteMulti(table, col, vals) {
    if (!vals.length) return;
    const list = vals.map((v) => encodeURIComponent(v)).join(',');
    const r = await fetch(`${this._url}/rest/v1/${table}?${col}=in.(${list})`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.message || r.status);
    }
  },
  async updateProfile(userId, data) {
    return this.update('profiles', data, 'id', userId);
  },

  // Returns server UTC time via response Date header (immune to client clock drift)
  async serverTime() {
    try {
      const r = await fetch(`${this._url}/rest/v1/`, {
        method: 'HEAD',
        headers: { apikey: this._key },
      });
      const d = r.headers.get('Date');
      return d ? new Date(d) : new Date();
    } catch {
      return new Date();
    }
  },

  // Lightweight Supabase Realtime v2 subscription (Phoenix channels over WebSocket).
  // Filters to time_entries rows for userId. Returns an unsubscribe function.
  subscribe(userId, onEvent) {
    const host = new URL(this._url).hostname;
    const wsUrl = `wss://${host}/realtime/v1/websocket?apikey=${this._key}&vsn=1.0.0`;
    const topic = `realtime:sync-${userId.slice(0, 8)}`;
    let ws, hbId, ref = 0, dead = false;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        return;
      }
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            topic,
            event: 'phx_join',
            ref: String(++ref),
            payload: {
              access_token: this._token,
              config: {
                broadcast: { ack: false, self: false },
                presence: { key: '' },
                postgres_changes: [
                  {
                    event: '*',
                    schema: 'public',
                    table: 'time_entries',
                    filter: `user_id=eq.${userId}`,
                  },
                ],
              },
            },
          })
        );
        hbId = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                topic: 'phoenix',
                event: 'heartbeat',
                payload: {},
                ref: String(++ref),
              })
            );
          }
        }, 25000);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'postgres_changes' && msg.payload?.data) onEvent(msg.payload.data);
        } catch {}
      };
      ws.onclose = () => {
        clearInterval(hbId);
        if (!dead) setTimeout(connect, 5000);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      dead = true;
      clearInterval(hbId);
      try {
        ws?.close();
      } catch {}
    };
  },
};

export default sb;
