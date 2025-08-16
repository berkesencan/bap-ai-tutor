// Add BasicTeX to PATH for LaTeX compilation
process.env.PATH = `/usr/local/texlive/2025basic/bin/universal-darwin:${process.env.PATH}`;
 
const express = require('express'); 