package sample.app

abstract class BaseRepository {
    abstract fun findById(id: Int): Any?
    abstract fun findAll(): List<Any>
}
