# qow

![output](https://github.com/user-attachments/assets/b2cce027-a0eb-4781-b5f3-d5f772cd0c78)
> Gif created with [marquee](https://github.com/qnton/marquee)

**Natural language to CLI commands**

I created this project because I sometimes forget terminal commands and don't want to switch through windows or open a browser to search for them. `qow` brings the exact command you need right into your CLI!

## Installation

Install `qow` globally via npm:

```bash
npm i -g @qnton/qow
```

## Setup

To use `qow`, you need a free OpenRouter API key. Run the setup command to configure it:

```bash
qow --setup
```
*(This will save your API key locally in `~/.qow.json`)*

## Usage

Simply run `qow` followed by what you want to achieve in natural language:

```bash
qow extract a tar file
qow find all js files modified in the last 7 days
qow kill process running on port 3000
```

`qow` will compute the precise command and output it directly to your terminal.
