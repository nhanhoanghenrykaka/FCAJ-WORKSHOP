package dev.namphamcse.shopsflow.mapper;

import dev.namphamcse.shopsflow.dto.response.UserResponse;
import dev.namphamcse.shopsflow.entity.User;

public class UserMapper {
    private UserMapper() {}
    public static UserResponse toResponse(User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getPhone(),
            user.getProfileImageUrl(),
            user.isBanned(),
            user.getRole()
        );
    }
}
