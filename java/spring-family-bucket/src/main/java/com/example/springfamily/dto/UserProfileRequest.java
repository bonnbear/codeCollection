package com.example.springfamily.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UserProfileRequest {

    @NotBlank(message = "name cannot be blank")
    @Size(max = 50, message = "name max length is 50")
    private String name;

    @NotBlank(message = "email cannot be blank")
    @Email(message = "email format is invalid")
    private String email;

    @NotNull(message = "age is required")
    @Min(value = 1, message = "age must be >= 1")
    @Max(value = 150, message = "age must be <= 150")
    private Integer age;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }
}
