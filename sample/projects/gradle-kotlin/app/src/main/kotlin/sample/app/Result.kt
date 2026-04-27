package sample.app

sealed class Result {
    data class Success(val data: String) : Result()
    data class Error(val message: String) : Result()
}
