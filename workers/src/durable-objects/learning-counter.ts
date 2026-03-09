/**
 * Learning Counter Durable Object
 * Purpose: Atomic daily learning limit counter
 * Prevents concurrent KV get+put race conditions
 */

export class LearningCounter {
  private state: DurableObjectState;
  private count: number = 0;
  private date: string = '';
  
  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    
    // Restore state from storage
    state.blockConcurrencyWhile(async () => {
      this.count = (await state.storage.get<number>('count')) || 0;
      this.date = (await state.storage.get<string>('date')) || '';
    });
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/increment') {
      return this.increment();
    }
    
    if (url.pathname === '/get') {
      return this.getCount();
    }
    
    return new Response('Not found', { status: 404 });
  }
  
  private async increment(): Promise<Response> {
    const today = new Date().toISOString().split('T')[0];
    
    // Reset counter on date change
    if (this.date !== today) {
      this.date = today;
      this.count = 0;
      await this.state.storage.put('date', today);
    }
    
    this.count++;
    await this.state.storage.put('count', this.count);
    
    // Check daily limit (1000)
    if (this.count > 1000) {
      return new Response(JSON.stringify({ 
        allowed: false, 
        count: this.count,
        limit: 1000
      }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      allowed: true, 
      count: this.count,
      limit: 1000
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  private async getCount(): Promise<Response> {
    return new Response(JSON.stringify({ 
      count: this.count,
      date: this.date,
      limit: 1000
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
