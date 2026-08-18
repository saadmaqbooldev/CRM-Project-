"""Add OTP and phone fields to businesses

Revision ID: ac372a52b0e7
Revises: f2d67c9a6566
Create Date: 2026-08-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac372a52b0e7'
down_revision: Union[str, Sequence[str], None] = 'f2d67c9a6566'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add columns with server defaults so existing rows work
    op.add_column('businesses', sa.Column('phone', sa.String(length=20), nullable=True))
    op.add_column('businesses', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('businesses', sa.Column('otp_code', sa.String(length=6), nullable=True))
    op.add_column('businesses', sa.Column('otp_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('businesses', 'otp_expires_at')
    op.drop_column('businesses', 'otp_code')
    op.drop_column('businesses', 'is_verified')
    op.drop_column('businesses', 'phone')