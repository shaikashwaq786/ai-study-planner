from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20230809_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String, nullable=False, unique=True),
        sa.Column('email', sa.String, nullable=False, unique=True),
        sa.Column('hashed_password', sa.String, nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()),
    )
    # Subjects table
    op.create_table(
        'subjects',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('owner_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
    )
    # Topics table
    op.create_table(
        'topics',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('subject_id', sa.Integer, sa.ForeignKey('subjects.id'), nullable=False),
        sa.Column('difficulty', sa.Integer, nullable=False, server_default='0'),
        sa.Column('priority', sa.Integer, nullable=False, server_default='0'),
        sa.Column('completed', sa.Boolean, nullable=False, server_default=sa.false()),
    )
    # Exams table
    op.create_table(
        'exams',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('title', sa.String, nullable=False),
        sa.Column('date', sa.DateTime, nullable=False),
        sa.Column('owner_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('subject_id', sa.Integer, sa.ForeignKey('subjects.id'), nullable=False),
        sa.Column('notes', sa.Text, nullable=True),
    )
    # Study sessions table
    op.create_table(
        'study_sessions',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('start_time', sa.DateTime, nullable=False),
        sa.Column('end_time', sa.DateTime, nullable=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('notes', sa.Text, nullable=True),
    )

def downgrade():
    op.drop_table('study_sessions')
    op.drop_table('exams')
    op.drop_table('topics')
    op.drop_table('subjects')
    op.drop_table('users')

