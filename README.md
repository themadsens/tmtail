# tmtail

An ad-hoc replacement for [folkertvanheusden/multitail](https://github.com/https://github.com/folkertvanheusden/multitail) 
implemented with [tmux](https://github.com/tmux/tmux) and [grcat](https://github.com/garabik/grc)

The following features thus come more or less for free.
* Mouse aware for select, resize etc.
* The full tmux copy-mode for scrollback browsing, searching etc
* Easily extendible by adding bindings for tmux actions. The sky is the limit

Color highlighting is done with an node clone of grcat, [grcat.js](), which is about a factor 10 faster than the python original

WIP ..
