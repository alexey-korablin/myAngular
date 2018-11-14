'use strict';

const _ = require('lodash');
const ESCAPES = {
    'n': '\n',
    'f': '\f',
    'r': '\r',
    't': '\t',
    'v': '\v',
    '\'': '\'',
    '"': '"'
};

function parse(expr) {
    const lexer = new Lexer();
    const parser = new Parser(lexer);
    return parser.parse(expr);
}

class Lexer {

    lex(text) {
        this.text = text;
        this.index = 0;
        this.ch = null;
        this.tokens = [];

        while (this.index < this.text.length) {
            this.ch = this.text.charAt(this.index);
            if (this.isNumber(this.ch) || (this.ch === '.' && this.isNumber(this.peek()))) {
                this.readNumber();
            } else if (this.ch === '\'' || this.ch === '"') {
                this.readString(this.ch);
            } else if (this.isIdent(this.ch)) {
                this.readIdent();
            } else if (this.isWhitspace(this.ch)) {
                this.index++;
            } else {
                throw `Unexpected next chracter ${this.ch}`;
            }
        }

        return this.tokens;
    }

    isWhitspace(ch) {
        return ch === ' ' || ch === '\r' ||
        ch === '\t' || ch === '\n' ||
        ch === '\v' || ch === '\u00A0';
    }

    isIdent(ch) {
        return (ch >= 'a' && ch <= 'z') ||
        (ch >= 'A' && ch <= 'Z') ||
        ch === '_' || ch === '$';
    }

    isNumber(ch) {
        return '0' <= ch && ch <= '9';
    }

    peek() {
        return this.index < this.text.length - 1 ? this.text.charAt(this.index + 1) : false;
    }

    isExpOperator(ch) {
        return ch === '-' || ch === '+' || this.isNumber(ch);
    }

    readIdent() {
        let text = '';
        while (this.index < this.text.length) {
            let ch = this.text.charAt(this.index);
            if (this.isIdent(ch) || this.isNumber(ch)) {
                text += ch;
            } else {
                break;
            }
            this.index++;
        }
        const token = { text: text };
        this.tokens.push(token);
    }

    readString(quote) {
        this.index++;
        let string = '';
        let escape = false;
        while (this.index < this.text.length) {
            const ch = this.text.charAt(this.index);
            if (escape) {
                if (ch === 'u') {
                    const hex = this.text.substring(this.index + 1, this.index + 5);
                    if (!hex.match(/[\da-f]{4}/i)) {
                        throw 'Invalid unicode escape';
                    }
                    this.index += 4;
                    string += String.fromCharCode(parseInt(hex, 16));
                } else {
                    const replacement = ESCAPES[ch];
                    if (replacement) {
                        string += replacement;
                    } else {
                        string += ch;
                    }
                }
                escape = false;
            } else if (ch === quote) {
                this.index++;
                this.tokens.push({
                    text: string,
                    value: string
                });
                return;
            } else if (ch === '\\') {
                escape = true;
            } else {
                string += ch;
            }
            this.index++;
        }
        throw 'Unmatched quote';
    }

    readNumber() {
        let number = '';
        while (this.index < this.text.length) {
            const ch = this.text.charAt(this.index).toLowerCase();
            if (this.isNumber(ch) || ch === '.') {
                number += ch;
            } else {
                const nextCh = this.peek();
                const prevCh = number.charAt(number.length - 1);
                if (ch === 'e' && this.isExpOperator(nextCh)) {
                    number += ch;
                } else if (this.isExpOperator(ch) && prevCh === 'e' && nextCh && this.isNumber(nextCh)) {
                    number += ch;
                } else if (this.isExpOperator(ch) && prevCh === 'e' && !nextCh && !this.isNumber(nextCh)) {
                    throw 'Invalid exponent';
                } else {
                    break;
                }
            }
            this.index++;
        }
        this.tokens.push({
            text: number,
            value: Number(number)
        });
    }
}

class AST {
    constructor(lexer) {
        this.lexer = lexer;
    }

    ast(text) {
        this.tokens = this.lexer.lex(text);
        return this.program();
    }

    program() {
        return { type: AST.Program, body: this.primary() };
    }

    primary() {
        if (this.constants.hasOwnProperty(this.tokens[0].text)) {
            return this.constants[this.tokens[0].text];
        } else {
            return this.constant();
        }
    }

    constant() {
        return { type: AST.Literal, value: this.tokens[0].value };
    }

    static get Program() {
        return 'Program';
    }

    static get Literal() {
        return 'Literal';
    }

    get constants() {
        return {
            'null': { type: AST.Literal, value: null },
            'true': { type: AST.Literal, value: true },
            'false': { type: AST.Literal, value: false }
        };
    }
}

class ASTCompiller {
    constructor(astBuilder) {
        this.astBuilder = astBuilder;
        this.stringEscapeRegex = /[^ a-zA-Z0-9]/g;
    }

    stringEscapeFn(c) {
        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    }

    escape(value) {
        if (_.isString(value)) {
            return '\'' + value.replace(this.stringEscapeRegex, this.stringEscapeFn) + '\'';
        } else if (_.isNull(value)) {
            return 'null';
        } else {
            return value;
        }
    }

    compile(text) {
        const ast = this.astBuilder.ast(text);
        this.state = { body: [] };
        this.recurse(ast);
        return new Function(this.state.body.join(' '));
    }

    recurse(ast) {
        switch (ast.type) {
            case AST.Program:
                this.state.body.push('return', this.recurse(ast.body), ';');
                break;

            case AST.Literal:
                return this.escape(ast.value);
        }
    }
}

class Parser {
    constructor(lexer) {
        this.lexer = lexer;
        this.ast = new AST(this.lexer);
        this.astCompiler = new ASTCompiller(this.ast);
    }

    parse(text) {
        return this.astCompiler.compile(text);
    }
}

module.exports = parse; 