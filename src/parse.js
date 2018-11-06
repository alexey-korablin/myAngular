'use strict';

function parse(expr) {
    const lexer = new Lexer();
    const parser = new Parser(lexer);
    return parser.parse(expr);
}

class Lexer {

    lex(text) {

    }
}

class AST {
    constructor(lexer) {
        this.lexer = lexer;
    }

    ast(text) {
        this.tokens = this.lexer.lex(text);
    }
}

class ASTCompiller {
    constructor(astBuilder) {
        this.astBuilder = astBuilder;
    }

    compile(text) {
        const ast = this.astBuilder.ast(text);
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