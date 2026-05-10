from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.auth import verify_user, create_access_token, get_demo_accounts, require_auth, register_user
from app.models import UserRegister
from types import SimpleNamespace

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    result = verify_user(body.username, body.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token(result["user_id"], body.username)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={"user_id": result["user_id"], "name": result["name"]},
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: UserRegister):
    result = register_user(body.username, body.password, body.name)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )
    token = create_access_token(result["user_id"], body.username)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={"user_id": result["user_id"], "name": result["name"]},
    )


@router.post("/logout", status_code=204)
def logout():
    return None


@router.get("/me")
def me(current_user: SimpleNamespace = Depends(require_auth)):
    return {
        "user_id":  current_user.user_id,
        "username": current_user.username,
        "is_guest": False,
    }
