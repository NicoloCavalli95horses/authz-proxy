# ============================================================
# Import
# ============================================================
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

# ============================================================
# RUN
# ============================================================
class Run(Base):
  __tablename__ = "runs"

  id: Mapped[int] = mapped_column(
    Integer,
    primary_key=True,
  )

  # "exploration" || "replay"
  type: Mapped[str] = mapped_column(
    String(32),
    nullable=False,
  )

  created_at: Mapped[datetime] = mapped_column(
    DateTime,
    default=lambda: datetime.now(timezone.utc),
    nullable=False,
  )
  
  config: Mapped[dict] = mapped_column(
    JSONB,
    nullable=False,
  )

  # Relationships
  states: Mapped[list["DomState"]] = relationship(
    back_populates="run",
    cascade="all, delete-orphan",
  )

  interaction_executions: Mapped[list["InteractionExecution"]] = relationship(
    back_populates="run",
    cascade="all, delete-orphan",
  )


# ============================================================
# DOM STATE
# ============================================================
class DomState(Base):
  __tablename__ = "dom_states"

  id: Mapped[int] = mapped_column(
    Integer,
    primary_key=True,
  )

  run_id: Mapped[int] = mapped_column(
    ForeignKey("runs.id", ondelete="CASCADE"),
    nullable=False,
  )

  # node id defined by the client
  state_id: Mapped[str] = mapped_column(
    String(128),
    nullable=False,
  )

  # DOM snapshot (str) 
  snapshot: Mapped[str] = mapped_column(
    Text,
    nullable=False,
  )

  # hash of clickable elements (using their fingerprint)
  hash: Mapped[str] = mapped_column(
    Text,
    nullable=False,
  )

  # of the current page
  url: Mapped[str] = mapped_column(
    Text,
    nullable=False,
  )

  # Relationships
  run: Mapped["Run"] = relationship(
    back_populates="states",
  )

  outgoing_executions: Mapped[list["InteractionExecution"]] = relationship(
    foreign_keys="InteractionExecution.from_state_id",
    back_populates="from_state",
  )

  incoming_executions: Mapped[list["InteractionExecution"]] = relationship(
    foreign_keys="InteractionExecution.to_state_id",
    back_populates="to_state",
  )

  __table_args__ = (
    UniqueConstraint(
      "run_id",
      "state_id",
      name="uq_dom_state_run_state",
    ),
  )


# ============================================================
# LOGICAL INTERACTION

# Logical interaction (eg. click) are separated from actual interaction execution
# This eases the comparison of the same logical interaction in different runs
# ============================================================
class Interaction(Base):
  __tablename__ = "interactions"

  id: Mapped[int] = mapped_column(
    Integer,
    primary_key=True,
  )

  type: Mapped[str] = mapped_column(
    String(32),
    nullable=False,
  )

  element_fingerprint: Mapped[str] = mapped_column(
    String(256),
    nullable=False,
  )

  element_data: Mapped[dict] = mapped_column(
    JSONB,
    nullable=False,
  )

  # Relationships
  executions: Mapped[list["InteractionExecution"]] = relationship(
    back_populates="interaction",
  )

  __table_args__ = (
    UniqueConstraint(
      "type",
      "element_fingerprint",
      name="uq_logical_interaction",
    ),
  )


# ============================================================
# INTERACTION EXECUTION
# ============================================================
class InteractionExecution(Base):
  __tablename__ = "interaction_executions"

  id: Mapped[int] = mapped_column(
    Integer,
    primary_key=True,
  )

  run_id: Mapped[int] = mapped_column(
    ForeignKey("runs.id", ondelete="CASCADE"),
    nullable=False,
  )

  interaction_id: Mapped[int] = mapped_column(
    ForeignKey("interactions.id", ondelete="CASCADE"),
    nullable=False,
  )

  from_state_id: Mapped[int] = mapped_column(
    ForeignKey("dom_states.id", ondelete="CASCADE"),
    nullable=False,
  )

  to_state_id: Mapped[int | None] = mapped_column(
    ForeignKey("dom_states.id", ondelete="CASCADE"),
    nullable=True,
  )

  # Relationships
  run: Mapped["Run"] = relationship(
    back_populates="interaction_executions",
  )

  interaction: Mapped["Interaction"] = relationship(
    back_populates="executions",
  )

  from_state: Mapped["DomState"] = relationship(
    foreign_keys=[from_state_id],
    back_populates="outgoing_executions",
  )

  to_state: Mapped["DomState | None"] = relationship(
    foreign_keys=[to_state_id],
    back_populates="incoming_executions",
  )

  requests: Mapped[list["HttpRequest"]] = relationship(
    back_populates="interaction_execution",
    cascade="all, delete-orphan",
  )
  
  navigations: Mapped[list["Navigation"]] = relationship(
    back_populates="interaction_execution",
    cascade="all, delete-orphan",
  )


# ============================================================
# HTTP REQUEST
# ============================================================
class HttpRequest(Base):
  __tablename__ = "http_requests"

  id: Mapped[int] = mapped_column(
    Integer,
    primary_key=True,
  )

  interaction_execution_id: Mapped[int] = mapped_column(
    ForeignKey(
      "interaction_executions.id",
      ondelete="CASCADE",
      ),
    nullable=False,
  )

  method: Mapped[str] = mapped_column(
    String(16),
    nullable=False,
  )

  url: Mapped[str] = mapped_column(
    Text,
    nullable=False,
  )

  headers: Mapped[dict] = mapped_column(
    JSONB,
    nullable=False,
    default=dict,
  )

  body: Mapped[str | None] = mapped_column(
    Text,
    nullable=True,
  )

  # Relationships
  interaction_execution: Mapped["InteractionExecution"] = relationship(
    back_populates="requests",
  )

  response: Mapped["HttpResponse | None"] = relationship(
    back_populates="request",
    uselist=False,
    cascade="all, delete-orphan",
  )


# ============================================================
# NAVIGATION
# ============================================================
class Navigation(Base):
  __tablename__ = "navigations"

  id: Mapped[int] = mapped_column(
    Integer,
    primary_key=True,
  )

  interaction_execution_id: Mapped[int] = mapped_column(
    ForeignKey(
      "interaction_executions.id",
      ondelete="CASCADE",
    ),
    nullable=False,
  )
  
  source: Mapped[str] = mapped_column(
    String(16),
    nullable=False,
  )

  from_url: Mapped[str] = mapped_column(
    Text,
    nullable=False,
  )
  
  to_url: Mapped[str] = mapped_column(
    Text,
    nullable=True,
  )
  
  # HTTP method defined in <form> 
  method: Mapped[str] = mapped_column(
    String(16),
    nullable=True,
  )

  # Relationships
  interaction_execution: Mapped["InteractionExecution"] = relationship(
    back_populates="navigations",
  )


# ============================================================
# HTTP RESPONSE
# ============================================================
class HttpResponse(Base):
  __tablename__ = "http_responses"

  id: Mapped[int] = mapped_column(
    Integer,
    primary_key=True,
  )

  request_id: Mapped[int] = mapped_column(
    ForeignKey(
      "http_requests.id",
      ondelete="CASCADE",
    ),
    nullable=False,
    unique=True,
  )

  status_code: Mapped[int] = mapped_column(
    Integer,
    nullable=False,
  )
  
  url: Mapped[str] = mapped_column(
    Text,
    nullable=False,
  )

  headers: Mapped[dict] = mapped_column(
    JSONB,
    nullable=False,
    default=dict,
  )

  body: Mapped[str | None] = mapped_column(
    Text,
    nullable=True,
  )

  # Relationships
  request: Mapped["HttpRequest"] = relationship(
    back_populates="response",
  )
