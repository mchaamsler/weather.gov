let bundling = false;
let play = "testing";

export default {
  get bundling() {
    return bundling;
  },
  set bundling(v) {
    bundling = v;
  },

  get play() {
    return play;
  },
  set play(v) {
    play = v;
  },
};
