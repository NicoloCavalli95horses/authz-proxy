// eventBus.js

//===================
// Import
//===================


//===================
// Class
//===================
export class EventBus {

  constructor() {
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  async emit(event) {
    for (const callback of this.listeners) {
      await callback(event);
    }
  }
}