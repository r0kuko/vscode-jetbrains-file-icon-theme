package sample.app

interface UserRepository {
    fun findById(id: Int): String?
    fun findAll(): List<String>
}
