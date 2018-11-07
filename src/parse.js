'use strict';

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
            if (this.isNumber(this.ch)) {
                this.readNumber();
            } else {
                throw `Unexpected next chracter ${this.ch}`;
            }
        }

        return this.tokens;
    }

    isNumber(ch) {
        return '0' <= ch && ch <= '9';
    }

    readNumber() {
        let number = '';
        while (this.index < this.text.length) {
            const ch = this.text.charAt(this.index);
            if (this.isNumber(ch)) {
                number += ch;
            } else {
                break;
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
        return { type: AST.Program, body: this.constant() };
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
}

class ASTCompiller {
    constructor(astBuilder) {
        this.astBuilder = astBuilder;
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
                return ast.value;
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