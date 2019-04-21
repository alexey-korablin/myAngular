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
            if (this.isNumber(this.ch) || (this.is('.') && this.isNumber(this.peek()))) {
                this.readNumber();
            } else if (this.is('\'"')) {
                this.readString(this.ch);
            }  else if (this.is('[],{}:')) {
                this.tokens.push({
                    text: this.ch
                });
                this.index++;
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

    is(chs) {
        return chs.indexOf(this.ch) !== -1;
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
        const token = { 
            text: text,
            identifier: true
        };
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
        if (this.expect('[')) {
            return this.arrayDeclaration();
        } else if (this.expect('{')) {
            return this.object();
        } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
            return this.constants[this.consume().text];
        } else if (this.peek().identifier) {
            return this.identifier();
        } else {
            return this.constant();
        }
    }

    expect(e) {
        const token = this.peek(e);
        if (token) {
            return this.tokens.shift();
        }
    }

    arrayDeclaration() {
        const elements = [];
        if (!this.peek(']')) {
            do {
                elements.push(this.primary());
            } while (this.expect(','));
        }
        this.consume(']');
        return { type: AST.ArrayExpression, elements };
    }

    peek(e) {
        if (this.tokens.length > 0) {
            const text = this.tokens[0].text;
            if (text === e || !e) {
                return this.tokens[0];
            }
        }
    }

    consume(e) {
        const token = this.expect(e);
        if (!token) {
            throw `Unexpected. Expecting: ${e}`;
        }
        return token;
    }

    object() {
        const properties = [];
        if (!this.peek('}')) {
            do {
                const property = { type: AST.Property };
                if (this.peek().identifier) {
                    property.key = this.identifier();
                } else {
                    property.key = this.constant();
                }
                this.consume(':');
                property.value = this.primary();
                properties.push(property);
            } while (this.expect(','));
        }
        this.consume('}');
        return { type: AST.ObjectExpression, properties };
    }

    identifier() {
        return { type: AST.Identifier, name: this.consume().text };
    }

    constant() {
        return { type: AST.Literal, value: this.consume().value };
    }

    static get Program() {
        return 'Program';
    }

    static get Literal() {
        return 'Literal';
    }

    static get ArrayExpression() {
        return 'ArrayExpression';
    }

    static get ObjectExpression() {
        return 'ObjectExpression';
    }

    static get Property() {
        return 'Property';
    }

    static get Identifier() {
        return 'Identifier';
    }

    static get ThisExpression() {
        return 'ThisExpression';
    }

    get constants() {
        return {
            'null': { type: AST.Literal, value: null },
            'true': { type: AST.Literal, value: true },
            'false': { type: AST.Literal, value: false },
            'this': { type: AST.ThisExpression }
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
        this.state = { body: [], nextId: 0, vars: [] };
        this.recurse(ast);
        return new Function('s', (this.state.vars.length ?
            `let ${this.state.vars.join(',')};`: ' ') + this.state.body.join(' '));
    }

    recurse(ast) {
        switch (ast.type) {
            case AST.Program:
                this.state.body.push('return', this.recurse(ast.body), ';');
                break;

            case AST.Literal:
                return this.escape(ast.value);

            case AST.ArrayExpression:
                const elements = _.map(
                    ast.elements,
                    (element => this.recurse(element)),
                    this
                );
                return `[${elements.join(',')}]`;
            
            case AST.ObjectExpression:
                const properties = _.map(
                    ast.properties,
                    (property => {
                        const key = property.key.type === AST.Identifier ?
                            property.key.name
                            : this.escape(property.key.value);
                        const value = this.recurse(property.value);
                        return `${key}:${value}`;
                    }),
                    this);
                return `{${properties.join(',')}}`;
            case AST.Identifier:
                const intoId = this.nextId();
                this.if_('s', this.assign(intoId, this.nonComputedMember('s', ast.name)));
                return intoId;
            case AST.ThisExpression:
                    return 's';
        }
    }

    nonComputedMember(left, right) {
        return `(${left}).${right}`;
    }

    if_(test, consequent) {
        this.state.body.push('if(', test, '){', consequent, '}');
    }

    assign(id, value) {
        return `${id}=${value}`;
    }

    nextId() {
        const id = 'v' + (this.state.nextId++);
        this.state.vars.push(id);
        return id;
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