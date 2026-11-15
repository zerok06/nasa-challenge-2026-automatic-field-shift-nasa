# Build de APK de prueba (Windows)

El build local en `C:\Users\Jose Paye\...` falló por dos límites de Windows:

1. CMake/Ninja regeneraba `build.ninja` en un bucle cuando la ruta tenía espacios.
2. El codegen de `react-native-gesture-handler` generaba un `.cpp.o` de más de
   260 caracteres.

## Workaround aplicado

1. Copiar `application/` a una ruta corta y sin espacios, por ejemplo
   `C:\anden-app`, excluyendo builds y caches:
   - `.expo`
   - `.gradle`
   - `android\build`
   - `android\app\build`
   - `.cxx` de `react-native-screens` y `react-native-worklets`.
2. En la copia, agregar al inicio de
   `node_modules/react-native/ReactAndroid/cmake-utils/default-app-setup/CMakeLists.txt`:

   ```cmake
   set(CMAKE_OBJECT_PATH_MAX 250)
   ```

3. Borrar `android\app\.cxx` para forzar la configuración.
4. Compilar universal (teléfono arm64 + emulador x86_64):

   ```powershell
   $env:JAVA_HOME='C:\android-tools\jdk21\jdk-21.0.13.0.2+1'
   $env:ANDROID_HOME='C:\android-tools\sdk'
   $env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
   $env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
   cd C:\anden-app\android
   .\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,x86_64" --no-daemon
   ```

5. APK: `C:\anden-app\android\app\build\outputs\apk\release\app-release.apk`.
6. Instalar:

   ```powershell
   adb install -r app-release.apk
   ```

## Notas

- `applicationId` es `com.anden.app`; el `namespace` nativo sigue siendo
  `com.automatic.app` por compatibilidad con el proyecto Android existente.
- La firma es la `debug.keystore`: sirve para pruebas, no para Play Store.
- Para un APK solo arm64 (más pequeño), usar
  `-PreactNativeArchitectures=arm64-v8a`.
- El APK apunta a `EXPO_PUBLIC_API_URL` de `.env.local`; verificar que sea la URL
  de GCP antes de compilar.
