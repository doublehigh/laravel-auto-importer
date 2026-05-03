# Laravel Auto Import 🚀

A smart VS Code extension that brings PhpStorm-like import intelligence to Laravel development.

It automatically imports Laravel facades, models, and classes — and safely removes unused imports without breaking your code.

---

## ⚡ Why this exists

Laravel developers constantly deal with:
- Missing `use` statements
- Repeated imports
- Manual cleanup of unused classes
- Slower workflow compared to PhpStorm

**Laravel Auto Import fixes all of that automatically.**

---

## ✨ Features

### 🔹 Smart Auto Imports
Automatically imports:
- Laravel Facades (Auth, DB, Cache, Route)
- Eloquent Models (User, Product, Order, etc.)
- Utility Classes (Str, Carbon)
- Eloquent Relations (HasMany, BelongsTo, etc.)

---

### 🔹 PhpStorm-Level Cleanup Engine
On file save, it automatically removes **unused imports safely**.

It understands:
- Static usage (`Auth::user()`)
- Object creation (`new User()`)
- Inheritance (`extends Model`)
- Interfaces (`implements Interface`)
- Type-hint injection (`Request $request`) ✅
- Constructor injection (`__construct(Request $request)`)

---

### 🔹 Smart Model Detection
If a model exists in:

```

app/Models/

````text

It automatically resolves:
```php
User::all();
````

Into:

```php
use App\Models\User;
```

---

### 🔹 Zero Configuration

* Works instantly after installation
* No setup required
* Lightweight and fast

---

## 🧠 How It Works

### Auto Import Flow

When you type:

```php
Auth::user();
User::all();
HasMany;
```

It automatically adds:

```php
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

---

### Cleanup Flow (on save)

If you remove usage:

```php
use Illuminate\Http\Request;

public function store(Request $request)
```

The import is safely preserved or removed based on real usage detection.

---

## 🚀 Example

### Before

```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController
{
    public function index(Request $request)
    {
        Auth::user();
    }
}
```

---

### After Cleanup + Smart Import

```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController
{
    public function index(Request $request)
    {
        Auth::user();
    }
}
```

---

## ⚙️ Settings

```json
"laravelAutoImport.enable": true,
"laravelAutoImport.debounceTime": 400,
"laravelAutoImport.enableCleanup": true
```

---

## 📦 Installation

1. Open VS Code
2. Go to Extensions
3. Search: **Laravel Auto Import**
4. Click Install
5. Start coding in Laravel 🚀

---

## 💡 What makes this different?

Unlike basic auto-import extensions:

✔ Understands Laravel structure
✔ Supports models + facades + relations
✔ Cleans unused imports safely
✔ Prevents false deletion of type-hints
✔ Behaves like PhpStorm intelligence

---

## 🔥 Future Improvements

* AST-based parsing engine
* Import sorting (PSR-12 standard)
* Full Laravel container awareness
* AI-powered import prediction
* Auto-import on paste
* Blade file support

---

## 👨‍💻 Author

**Ibrahim Ishaq**

Building developer tools that improve Laravel productivity inside VS Code.

---

## 📄 License

MIT License — free to use and modify.

---

## ⭐ Support

If you find this useful:

* ⭐ Star the repo
* 📦 Install from Marketplace
* 🔁 Share with Laravel developers

```
