# typeracer

![typeracer GIF](typeracer.gif)

## Install

```
# npm install --global typeracer
```

## Things to know

Each line has by default `MAX_WORDS_PER_LINE = 12`. If the width of your terminal is smaller than any of the lines, 
typeracer will fuck up. If you insist on having a tiny terminal, feel free to change the value of `MAX_WORDS_PER_LINE`.

If you want to add quotes, you have to do it manually in `quotes.json`. I might make it easier to do this in the future.
