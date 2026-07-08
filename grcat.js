#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Text and background colors mapping (matches Python version definitions)
const colours = {
  none           : "",
  default        : "\x1b[0m",
  bold           : "\x1b[1m",
  underline      : "\x1b[4m",
  blink          : "\x1b[5m",
  reverse        : "\x1b[7m",
  concealed      : "\x1b[8m",

  black          : "\x1b[30m",
  red            : "\x1b[31m",
  green          : "\x1b[32m",
  yellow         : "\x1b[33m",
  blue           : "\x1b[34m",
  magenta        : "\x1b[35m",
  cyan           : "\x1b[36m",
  white          : "\x1b[37m",

  on_black       : "\x1b[40m",
  on_red         : "\x1b[41m",
  on_green       : "\x1b[42m",
  on_yellow      : "\x1b[43m",
  on_blue        : "\x1b[44m",
  on_magenta     : "\x1b[45m",
  on_cyan        : "\x1b[46m",
  on_white       : "\x1b[47m",

  beep           : "\x07",
  previous       : "prev",
  unchanged      : "unchanged",

  // non-standard attributes
  dark           : "\x1b[2m",
  italic         : "\x1b[3m",
  rapidblink     : "\x1b[6m",
  strikethrough  : "\x1b[9m",

  // aixterm bright color codes
  bright_black   : "\x1b[30;90m",
  bright_red     : "\x1b[31;91m",
  bright_green   : "\x1b[32;92m",
  bright_yellow  : "\x1b[33;93m",
  bright_blue    : "\x1b[34;94m",
  bright_magenta : "\x1b[35;95m",
  bright_cyan    : "\x1b[36;96m",
  bright_white   : "\x1b[37;97m",

  on_bright_black : "\x1b[40;100m",
  on_bright_red   : "\x1b[41;101m",
  on_bright_green : "\x1b[42;102m",
  on_bright_yellow: "\x1b[43;103m",
  on_bright_blue  : "\x1b[44;104m",
  on_bright_magenta:"\x1b[45;105m",
  on_bright_cyan  : "\x1b[46;106m",
  on_bright_white : "\x1b[47;107m",
};

// Ignore Ctrl+C to mimic Python's signal.signal(signal.SIGINT, signal.SIG_IGN)
process.on('SIGINT', () => {});

function add2list(clist, match, pattern) {
  // indices contains bounding arrays [start, end] for each capture group
  for (let group = 0; group < match.indices.length; group++) {
    const [start, end] = match.indices[group];
    if (group < pattern.colours.length) {
      clist.push({ start, end, group, match, pattern, colour: pattern.colours[group] });
    } else {
      clist.push({ start, end, group, match, pattern, colour: pattern.colours[0] });
    }
  }
}

function get_colour(x) {
  x = x.trim();
  if (colours[x] !== undefined) {
    return colours[x];
  } else if (x.length >= 2 && x.startsWith('"') && x.endsWith('"')) {
    try {
      // Emulate Python's eval(x) for literal string escaping (e.g. "\x1b...")
      return JSON.parse(x);
    } catch (e) {
      throw new Error('Bad colour specified: ' + x);
    }
  } else {
    throw new Error('Bad colour specified: ' + x);
  }
}

// Find config path
const home = process.env.HOME || '';
let xdg_config = process.env.XDG_CONFIG_HOME || (home ? path.join(home, '.config') : '');
let xdg_data = process.env.XDG_DATA_HOME || (home ? path.join(home, '.local/share') : '');

let conffilepath = [""];
if (xdg_data) conffilepath.push(path.join(xdg_data, 'grc'));
if (xdg_config) conffilepath.push(path.join(xdg_config, 'grc'));
if (home) conffilepath.push(path.join(home, '.grc'));
conffilepath.push('/usr/share/grc/');

if (process.argv.length !== 3) {
  process.stderr.write("You are not supposed to call grcat directly, but the usage is: grcat conffile\n");
  process.exit(1);
}

const conffile_arg = process.argv[2];
let conffile = null;

for (let dir of conffilepath) {
  const fullPath = dir ? path.join(dir, conffile_arg) : conffile_arg;
  try {
    if (fs.existsSync(fullPath) && !fs.statSync(fullPath).isDirectory()) {
      conffile = fullPath;
      break;
    }
  } catch (e) {}
}

if (!conffile) {
  process.stderr.write(`config file [${conffile_arg}] not found\n`);
  process.exit(1);
}

// Parse configuration file
const regexplist = [];
const fileContent = fs.readFileSync(conffile, 'utf-8');
const lines = fileContent.split(/\r?\n/).reverse();

while (lines.length) {
  let ll = { count: "more" };
  let hasData = false;

  while (lines.length) {
    let l = lines.pop();
    if (l.startsWith('#') || l === '\n' || l === '\r\n' || l === '') {
      continue;
    }

    if (!/^[a-zA-Z]/.test(l)) {
      break;
    }

    hasData = true;
    const eqIdx = l.indexOf('=');
    if (eqIdx === -1) {
      process.stderr.write('Error in configuration, I expect keyword=value line ('+l+')\n');
      process.exit(1);
    }

    let keyword = l.substring(0, eqIdx).trim().toLowerCase();
    let value = l.substring(eqIdx + 1).replace(/[\r\n]+$/, '');

    if (['colors', 'colour', 'color'].includes(keyword)) {
      keyword = 'colours';
    }
    if (!["regexp", "colours", "count", "command", "skip", "replace", "concat"].includes(keyword)) {
      process.stderr.write("Invalid keyword: "+keyword+" ("+l+")");
      process.exit(1);
    }
    ll[keyword] = value;
  }

  if (hasData) {
    if (ll.colours) {
      // Split string into one lcolor list per regex group
      ll.colourspec = ll.colours;
      const colgroups = ll.colours.split(',');
      ll.colours = colgroups.map(cg => cg.trim().split(/\s+/).map(colgroup => get_colour(colgroup)).join(''));
    }

    if (ll.regexp) {
      let fixedRegex = ll.regexp.replace(/\[\^\]/g, '[^\\]');
      ll.regexObj = new RegExp(fixedRegex, 'gd');
      regexplist.push(ll);
    }
  }
}

// Global coloring states
let prevcolour = colours.default;
let prevcount = "more";
let blockflag = 0;
let blockcolour = colours.default;

const rl = readline.createInterface({
                                    input: process.stdin,
                                    output: process.stdout,
                                    terminal: false
});

rl.on('line', (line) => {
  let clist = [];
  let skip = false;

  for (let pattern of regexplist) {
    let pos = 0;
    let currcount = pattern.count;
    let was_replace = false;

    // FIX: Grab the pre-compiled regex object and reset its tracker position
    const regex = pattern.regexObj;

    let m = null;
    while (true) {
      // Explicitly sync the stateful pointer if it was manually advanced inside the loop
      regex.lastIndex = pos;
      m = regex.exec(line);

      if (m) {
        let fullMatchString = m[0];
        let startPos = m.index;

        if (pattern.replace !== undefined) {
          if (was_replace) break;
          line = line.replace(pattern.regexObj, pattern.replace);
          was_replace = true;
        }

        if (pattern.replace !== undefined) {
          if (was_replace) break; // 
          line = line.replace(pattern.regexObj, pattern.replace);
          was_replace = true; // 
          // Re-sync loop parameters to evaluate new altered strings safely
          pos = 0; 
          continue;
        }

        if (pattern.colours !== undefined) {
          if (currcount === "block") {
            blockflag = 1;
            blockcolour = pattern.colours[0];
            currcount = "stop";
            break;
          } else if (currcount === "unblock") {
            blockflag = 0;
            blockcolour = colours.default;
            currcount = "stop";
          }

          add2list(clist, m, pattern);

          if (currcount === "previous") {
            currcount = prevcount;
          }
          if (currcount === "stop") {
            break;
          }
          if (currcount === "more") {
            prevcount = "more";
            let newpos = startPos + fullMatchString.length;
            if (newpos === pos) {
              pos += 1;
            } else {
              pos = newpos;
            }
          } else {
            prevcount = "once";
            pos = line.length;
          }
        }

        if (pattern.concat !== undefined) {
          fs.appendFileSync(pattern.concat, line + '\n');
          if (pattern.colours === undefined) break;
        }

        if (pattern.command !== undefined) {
          try {
            execSync(pattern.command, { stdio: 'inherit' });
          } catch (e) {}
          if (pattern.colours === undefined) break;
        }

        if (pattern.skip !== undefined) {
          skip = ["yes", "1", "true"].includes(pattern.skip);
          if (pattern.colours === undefined) break;
        }
      } else {
        break;
      }
    }

    if (m && currcount === "stop") {
      prevcount = "stop";
      break;
    }
  }

  if (clist.length === 0) {
    prevcolour = colours.default;
  }


  let first_char = 0;
  let last_char = 0;
  let length_line = line.length;
  let cline = [];

  if (!blockflag) {
    cline = Array(length_line + 1).fill(colours.default);
    for (let i of clist) {
      if (i.start === -1) continue;

      let colorVal = i.colour;
      if (i.colour === "prev") {
        colorVal = colours.default + prevcolour;
      } else if (i.colour !== "unchanged") {
        colorVal = colours.default + i.colour;
      }

      if (i.colour !== "unchanged") {
        for (let c = i.start; c < i.end; c++) {
          cline[c] = colorVal;
        }
      }

      if (i.start === 0) {
        first_char = 1;
        if (i.colour !== "prev") {
          prevcolour = i.colour;
        }
      }
      if (i.end === length_line) {
        last_char = 1;
      }
    }

    if (first_char === 0 || last_char === 0) {
      prevcolour = colours.default;
    }
  } else {
    cline = Array(length_line + 1).fill(blockcolour);
  }

  let nline = "";
  let clineprev = "";
  if (!skip) {
    for (let i = 0; i < line.length; i++) {
      if (cline[i] === clineprev) {
        nline += line[i];
      } else {
        nline += cline[i] + line[i];
        clineprev = cline[i];
      }
    }
    nline += colours.default;

    try {
      process.stdout.write(nline + '\n');
    } catch (e) {
      if (e.code === 'EPIPE') {
        process.exit(0);
      } else {
        throw e;
      }
    }
  }
});

rl.on("close", () => {
  debugger;
});
