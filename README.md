# tmtail

An ad-hoc replacement for [folkertvanheusden/multitail](https://github.com/https://github.com/folkertvanheusden/multitail) 
implemented with [tmux](https://github.com/tmux/tmux) and [grcat](https://github.com/garabik/grc)

The following features thus come more or less for free.
* Mouse aware for select, resize etc.
* The full tmux copy-mode for scrollback browsing, searching etc
* Copy scrollback text to the clipboard (y & Y) without any fuzz, via tmux clipboard integration
* Easily extendible by adding bindings for tmux actions. The sky is the limit ..

Color highlighting is done with an node clone of grcat, [grcat.js](), which is about a factor 10 faster than the python original

Currently a default grcat configuration is baked into tmtail that should be well suited for tailing [wildfly](https://www.wildfly.org/) logs

## Installation
Make sure tmux & node is installed, then dump [tmtail]() and [grcat.js]() somewhere in your $PATH

## Syntax
`Usage: tmtail [-n lines] [-c colorconf] <file1> [file2] [file3] ...`

Default scrollback is 1000 lines.<br/>
A `colorconf` file is located in the same places [grcat](https://github.com/garabik/grc#configuration) will look.

## Commands
The following help text is provided when pressing `h` or `?`
```
  Up,k        Select next pane up
  Down,j      Select next pane down
  Left        Select next pane left
  Right       Select next pane right
  M-Up,M-k    Select next pane up and set height to 50%
  M-Down,M-j  Select next pane down and set height to 50%
  +           Set pane height to 50%
  _           Set pane height to 90%
  =,U,Escape  Show all panes in equal height
  M-=         Show panes tiled
  z           Zoom pane
  u           Select pane from a menu to zoom (but not scroll)
  B           Zoom pane (if not) and enter scrollback mode
  B           One halfpage back if in scrollback mode already
  F           One halfpage forward if in scrollback mode
  y           Yank. Copy selection to clipboard
  Y           Yank line to clipboard
  ?,/,n,N,V   Search etc. in scrollback mode.
              See man tmux / copy-mode for others
  h,?         Show this help text
  Enter,Space Add a marker line to all panes
  :           Enter the tmux command prompt
  q,Q         quit
```

## Screenshot
<img width="829" height="707" alt="image" src="https://github.com/user-attachments/assets/6124ffe1-5737-4be8-8be2-bf20e1f5aa7f" />
