import { describe, it, expect } from 'vitest';
import { detectKotlinKind, stripCommentsAndStrings } from '../src/kotlin-detection';

describe('stripCommentsAndStrings', () => {
    it('removes line comments', () => {
        const input = 'class Foo // this is a comment with object keyword';
        expect(stripCommentsAndStrings(input)).toBe('class Foo ');
    });

    it('removes block comments', () => {
        const input = 'class Foo /* object Bar */ {}';
        expect(stripCommentsAndStrings(input)).toBe('class Foo  {}');
    });

    it('removes regular strings', () => {
        const input = 'val x = "interface Foo"';
        expect(stripCommentsAndStrings(input)).toBe('val x = ');
    });

    it('removes raw strings', () => {
        const input = 'val x = """enum class Foo"""';
        expect(stripCommentsAndStrings(input)).toBe('val x = ');
    });
});

describe('detectKotlinKind', () => {
    it('detects a simple class', () => {
        const input = `
package sample.app

class UserService {
    fun getUser(id: Int): String {
        return "User"
    }
}`;
        expect(detectKotlinKind(input)).toBe('class');
    });

    it('detects abstract class', () => {
        const input = `
package sample.app

abstract class BaseRepository {
    abstract fun findById(id: Int): Any?
}`;
        expect(detectKotlinKind(input)).toBe('abstract_class');
    });

    it('detects object', () => {
        const input = `
package sample.app

object AppConfig {
    const val APP_NAME = "SampleApp"
}`;
        expect(detectKotlinKind(input)).toBe('object');
    });

    it('detects interface', () => {
        const input = `
package sample.app

interface UserRepository {
    fun findById(id: Int): String?
}`;
        expect(detectKotlinKind(input)).toBe('interface');
    });

    it('detects enum class', () => {
        const input = `
package sample.app

enum class UserRole {
    ADMIN,
    USER,
    GUEST
}`;
        expect(detectKotlinKind(input)).toBe('enum');
    });

    it('detects annotation class', () => {
        const input = `
package sample.app

annotation class Inject`;
        expect(detectKotlinKind(input)).toBe('annotation');
    });

    it('detects typealias', () => {
        const input = `
package sample.app

typealias UserMap = Map<Int, String>`;
        expect(detectKotlinKind(input)).toBe('typealias');
    });

    it('detects data class', () => {
        const input = `
package sample.app

data class User(
    val id: Int,
    val name: String
)`;
        expect(detectKotlinKind(input)).toBe('data_class');
    });

    it('detects sealed class (pure, no nested data classes)', () => {
        const input = `
package sample.app

sealed class Result {
    class Success(val data: String) : Result()
    class Error(val message: String) : Result()
}`;
        expect(detectKotlinKind(input)).toBe('sealed_class');
    });

    it('detects sealed class with nested data classes', () => {
        const input = `
package sample.app

sealed class Result {
    data class Success(val data: String) : Result()
    data class Error(val message: String) : Result()
}`;
        expect(detectKotlinKind(input)).toBe('sealed_class');
    });

    it('returns null for mixed declarations (class + object)', () => {
        const input = `
package sample.app

class UserService {
    fun getUser(id: Int): String {
        return "User"
    }
}

object b {}`;
        expect(detectKotlinKind(input)).toBeNull();
    });

    it('returns null for no declarations (just functions)', () => {
        const input = `
package sample.app

fun main() {
    println("Hello from Kotlin!")
}`;
        expect(detectKotlinKind(input)).toBeNull();
    });

    it('ignores companion object', () => {
        const input = `
package sample.app

class Foo {
    companion object {
        const val TAG = "Foo"
    }
}`;
        expect(detectKotlinKind(input)).toBe('class');
    });

    it('ignores keywords in comments', () => {
        const input = `
package sample.app

// This object is a class
class Foo {}`;
        expect(detectKotlinKind(input)).toBe('class');
    });

    it('ignores keywords in strings', () => {
        const input = `
package sample.app

class Foo {
    val desc = "This is an interface description"
}`;
        expect(detectKotlinKind(input)).toBe('class');
    });

    it('returns null for interface + class mix', () => {
        const input = `
package sample.app

interface Foo {}
class Bar : Foo {}`;
        expect(detectKotlinKind(input)).toBeNull();
    });
});
