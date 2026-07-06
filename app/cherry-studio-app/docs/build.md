# 如何应用构建

## 安装依赖

```bash
npm install -g expo-cli eas-cli
```

## 打包

| 目标                             | 命令                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| 安卓本地构建（debug）            | `cd android && ./gradlew assembleDebug`                            |
| 安卓本地构建（release）          | `cd android && ./gradlew assembleRelease`                          |
| iOS 本地构建（debug）            | `cd ios && xcodebuild -scheme CherryStudio -configuration Debug`   |
| iOS 本地构建（release）          | `cd ios && xcodebuild -scheme CherryStudio -configuration Release` |
| 使用 EAS 线上编译安卓（debug）   | `eas build --platform android --profile development --local`       |
| 使用 EAS 线上编译安卓（release） | `eas build --platform android --local`                             |
| 使用 EAS 线上编译安卓            | `eas build --platform android`                                     |
| 使用 EAS 线上编译 iOS            | `eas build --platform ios`                                         |
| 调试运行安卓 App                 | `yarn android`                                                     |
| 调试运行 iOS App                 | `yarn ios`                                                         |

## gradle 镜像

```
    maven { url 'https://maven.aliyun.com/repository/google' }
    maven { url 'https://maven.aliyun.com/repository/jcenter' }
    maven { url 'https://maven.aliyun.com/repository/public' }
```
