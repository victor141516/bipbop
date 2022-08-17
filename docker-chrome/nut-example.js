// npm i @nut-tree/nut-js

"use strict";

const {keyboard, mouse, left, right, up, down, straightTo, centerOf, Region, Point} = require("@nut-tree/nut-js");

const square = async () => {
  await mouse.move(right(500));
  await mouse.move(down(500));
  await mouse.move(left(500));
  await mouse.move(up(500));
};

(async () => {
    //await keyboard.type('https://mfus.tk');
    //await square();
    await mouse.move(
        straightTo(
           centerOf(new Region(974, 545, 193, 88))
        )
    );
})();