// eventBus.js

//===================
// Import
//===================


//===================
// Class
//===================
export class EventBus {

  constructor() {
    this.listeners = [];
  }


  subscribe(callback) {
    this.listeners.push(callback);
  }


  emit(event) {
    for (const callback of this.listeners) {
      callback(event);
    }
  }
}